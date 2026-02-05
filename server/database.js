const { createClient } = require('@supabase/supabase-js');

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Supabase Adapter for SQLite-style calls
 * This allows us to migrate with minimal changes to route files.
 */
const db = {
    // Mimic db.get (return first row)
    get: async (sql, params, callback) => {
        try {
            const result = await processQuery(sql, params);
            if (callback) callback(null, result && result.length > 0 ? result[0] : null);
        } catch (err) {
            if (callback) callback(err);
        }
    },

    // Mimic db.all (return all rows)
    all: async (sql, params, callback) => {
        try {
            const result = await processQuery(sql, params);
            if (callback) callback(null, result);
        } catch (err) {
            if (callback) callback(err);
        }
    },

    // Mimic db.run (insert/update/delete)
    run: async (sql, params, callback) => {
        try {
            const result = await processQuery(sql, params, true);
            if (callback) {
                // Return whichever ID column is present (id, user_id, farm_id)
                const lastID = result?.id || result?.user_id || result?.farm_id || null;
                const context = { lastID, changes: 1 };
                callback.call(context, null);
            }
        } catch (err) {
            if (callback) callback(err);
        }
    },

    // Not used much in the current routes, but just in case
    serialize: (fn) => fn(),
    prepare: (sql) => ({
        run: (params, cb) => db.run(sql, params, cb),
        finalize: () => { }
    })
};

/**
 * A very basic SQL to Supabase translator
 * Handles simple SELECT, INSERT, UPDATE
 */
async function processQuery(sql, params = [], isMutation = false) {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');

    // 1. Handle SELECT
    if (cleanSql.toUpperCase().startsWith('SELECT')) {
        const tableMatch = cleanSql.match(/FROM\s+(\w+)/i);
        if (!tableMatch) throw new Error("Could not parse table name from SQL");
        const table = tableMatch[1];

        // Parse columns
        let colPart = cleanSql.match(/SELECT\s+(.*?)\s+FROM/i)[1];
        let selectCols = (colPart.trim() === '*' || colPart.includes(',')) ? '*' : colPart.trim();

        // Check for common JOINs used in the app
        if (cleanSql.toLowerCase().includes('join farms')) {
            // Map the SQL join to Supabase's hierarchical select
            // Supports both JOIN (inner) and LEFT JOIN patterns
            selectCols = '*, farms(*)';
        }

        let query = supabase.from(table).select(selectCols);

        // Handle WHERE (simple and case-insensitive)
        const whereMatch = cleanSql.match(/WHERE\s+(.*?)\s*[=]\s*\?/i) || cleanSql.match(/WHERE\s+LOWER\((.*?)\)\s*=\s*LOWER\(\?\)/i);
        if (whereMatch && params.length > 0) {
            const colName = whereMatch[1].trim();
            // If it was a LOWER() check, use ilike
            if (cleanSql.toLowerCase().includes('lower(')) {
                query = query.ilike(colName, params[0]);
            } else {
                query = query.eq(colName, params[0]);
            }
        }

        // Handle ORDER BY
        const orderMatch = cleanSql.match(/ORDER BY\s+(\w+)\s+(DESC|ASC)/i);
        if (orderMatch) {
            query = query.order(orderMatch[1], { ascending: orderMatch[2].toUpperCase() === 'ASC' });
        }

        // Handle LIMIT
        const limitMatch = cleanSql.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) {
            query = query.limit(parseInt(limitMatch[1]));
        }

        const { data, error } = await query;
        if (error) {
            console.error("Supabase SELECT Error:", error);
            throw error;
        }

        // Flatten joined results if any (e.g., if farms data is nested)
        const flattenedData = data.map(row => {
            const newRow = { ...row };
            // Supabase returns related table under its own key
            const farmData = Array.isArray(row.farms) ? row.farms[0] : row.farms;

            if (farmData) {
                // Merge common farm fields into the top level for existing routes
                newRow.farmer_name = farmData.farmer_name;
                newRow.location = farmData.location;
                newRow.farm_id = farmData.farm_id;
                newRow.soil_type = farmData.soil_type;
                newRow.field_size = farmData.field_size;
                newRow.current_crop = farmData.current_crop;
                delete newRow.farms;
            }
            return newRow;
        });

        return flattenedData;
    }

    // 2. Handle INSERT
    if (cleanSql.toUpperCase().startsWith('INSERT INTO')) {
        const table = cleanSql.match(/INSERT INTO\s+(\w+)/i)?.[1];
        const colsPart = cleanSql.match(/\((.*?)\)/);
        if (!table || !colsPart) throw new Error("Could not parse INSERT statement");

        const columns = colsPart[1].split(',').map(c => c.trim());
        const row = {};
        columns.forEach((col, idx) => {
            row[col] = params[idx];
        });

        const { data, error } = await supabase.from(table).insert(row).select();
        if (error) {
            console.error("Supabase INSERT Error:", error);
            throw error;
        }
        return data ? data[0] : null;
    }

    // 3. Handle UPDATE
    if (cleanSql.toUpperCase().startsWith('UPDATE')) {
        const table = cleanSql.match(/UPDATE\s+(\w+)/i)?.[1];
        const setMatch = cleanSql.match(/SET\s+(.*?)\s+WHERE/i);
        const whereMatch = cleanSql.match(/WHERE\s+(.*?)\s*=\s*\?/i);

        if (!table || !setMatch || !whereMatch) throw new Error("Could not parse UPDATE statement");

        const setClause = setMatch[1];
        // Split by comma but be careful with functions (though we don't use them in SET yet)
        const assignmentParts = setClause.split(',');
        const updateData = {};

        assignmentParts.forEach((part, idx) => {
            const col = part.split('=')[0].trim();
            updateData[col] = params[idx];
        });

        const whereCol = whereMatch[1].trim();
        const whereVal = params[params.length - 1];

        const { data, error } = await supabase.from(table).update(updateData).eq(whereCol, whereVal).select();
        if (error) {
            console.error("Supabase UPDATE Error:", error);
            throw error;
        }
        return data;
    }

    // 4. Handle DELETE (Simple)
    if (cleanSql.toUpperCase().startsWith('DELETE')) {
        const table = cleanSql.match(/FROM\s+(\w+)/i)?.[1];
        const whereMatch = cleanSql.match(/WHERE\s+(.*?)\s*=\s*\?/i);
        if (!table || !whereMatch) throw new Error("Could not parse DELETE statement");

        const { data, error } = await supabase.from(table).delete().eq(whereMatch[1].trim(), params[0]);
        if (error) throw error;
        return data;
    }

    throw new Error(`SQL type not supported by shim: ${cleanSql.substring(0, 50)}...`);
}

module.exports = db;
