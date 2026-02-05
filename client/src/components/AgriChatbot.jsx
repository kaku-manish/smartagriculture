import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const AgriChatbot = ({ farmData, recommendation, iotData }) => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            type: 'bot',
            text: 'Namaste! I am your Smart Agriculture Assistant with 40 years of farming experience. How can I help you today?',
            timestamp: new Date()
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Rule-based response patterns
    const ruleBasedResponses = {
        disease: {
            keywords: ['disease', 'problem', 'issue', 'sick', 'affected', 'infection', 'రోగం', 'సమస్య'],
            response: () => {
                if (recommendation?.disease_detected && recommendation.disease_detected !== "None") {
                    return `Based on my analysis, your paddy crop is affected by **${recommendation.disease_type}**. This is a ${recommendation.severity || 'moderate'} severity case.\n\n🔬 **Confidence:** ${recommendation.confidence || 'N/A'}%\n\n⚠️ **Immediate Action Required:** Please check the Action Plan for detailed treatment protocol.`;
                }
                return "Good news! Your crop appears healthy. No disease detected in the latest analysis. Continue regular monitoring and preventive care.";
            }
        },
        medicine: {
            keywords: ['medicine', 'treatment', 'spray', 'pesticide', 'chemical', 'cure', 'మందు', 'చికిత్స'],
            response: () => {
                if (recommendation?.medicine_suggestion) {
                    return `**Primary Treatment:**\n💊 ${recommendation.medicine_suggestion}\n📏 **Dosage:** ${recommendation.dosage}\n\n**Alternative Option:**\n${recommendation.medicine_secondary || 'Consult local agricultural expert'}\n\n⏰ **Application Timing:** ${recommendation.timeline || 'Apply as per instructions'}\n\n⚠️ **Safety Warning:** Always wear protective gear. Follow dosage strictly. Keep away from children and animals.`;
                }
                return "Your crop is currently healthy. No treatment needed. For preventive care, maintain proper field hygiene and monitor regularly.";
            }
        },
        cost: {
            keywords: ['cost', 'price', 'expense', 'money', 'budget', 'ఖర్చు', 'ధర'],
            response: () => {
                const fieldSize = farmData?.field_size || 1;
                const baseCost = 650;
                const estimatedCost = Math.round(baseCost * fieldSize);
                return `**Treatment Cost Estimation:**\n\n💰 Estimated Range: ₹${estimatedCost - 50} - ₹${estimatedCost + 50}\n📐 Based on: ${fieldSize} acres\n\nThis includes:\n• Pesticide/Medicine\n• Application charges\n• Safety equipment\n\n💡 Tip: Buy from authorized dealers for quality assurance.`;
            }
        },
        sensors: {
            keywords: ['sensor', 'iot', 'moisture', 'water', 'temperature', 'humidity', 'సెన్సార్', 'నీరు'],
            response: () => {
                if (iotData) {
                    return `**Current Field Conditions:**\n\n💧 Soil Moisture: ${iotData.soil_moisture}%\n🌊 Water Level: ${iotData.water_level} cm\n🌡️ Temperature: ${iotData.temperature}°C\n💨 Humidity: ${iotData.humidity}%\n\n**Expert Analysis:**\n${analyzeIoTData(iotData)}`;
                }
                return "IoT sensor data is currently unavailable. Please check your sensor connections.";
            }
        },
        prevention: {
            keywords: ['prevent', 'avoid', 'stop', 'protection', 'care', 'maintenance', 'నివారణ', 'జాగ్రత్త'],
            response: () => {
                return `**Preventive Measures (Based on 40 Years Experience):**\n\n1. **Field Hygiene:**\n   • Remove infected plant debris immediately\n   • Keep field boundaries clean\n   • Avoid water stagnation\n\n2. **Crop Rotation:**\n   • Rotate crops every season\n   • Avoid continuous paddy cultivation\n\n3. **Nutrient Management:**\n   • Test soil before fertilizer application\n   • Avoid excessive nitrogen\n   • Use balanced NPK\n\n4. **Monitoring:**\n   • Check crops daily during critical stages\n   • Watch for early disease symptoms\n   • Monitor pest activity\n\n5. **Water Management:**\n   • Irrigate early morning\n   • Maintain proper drainage\n   • Avoid over-watering`;
            }
        },
        weather: {
            keywords: ['weather', 'rain', 'climate', 'season', 'వాతావరణం', 'వర్షం'],
            response: () => {
                return `**Weather Advisory:**\n\n🌤️ Current Season: Suitable for paddy cultivation\n\n**Recommendations:**\n• Monitor weather forecasts regularly\n• Prepare drainage before monsoon\n• Avoid spraying before expected rain\n• Harvest timing is crucial - watch for weather changes\n\n💡 Pro Tip: In my 40 years, I've learned that timing is everything. Plan your activities around weather patterns.`;
            }
        }
    };

    const analyzeIoTData = (data) => {
        let analysis = [];

        if (data.soil_moisture < 30) {
            analysis.push("⚠️ Soil moisture is low. Irrigation recommended within 24 hours.");
        } else if (data.soil_moisture > 80) {
            analysis.push("⚠️ Soil is too wet. Check drainage to prevent root rot.");
        } else {
            analysis.push("✅ Soil moisture is optimal.");
        }

        if (data.temperature > 35) {
            analysis.push("🌡️ High temperature detected. Ensure adequate water supply.");
        } else if (data.temperature < 20) {
            analysis.push("🌡️ Temperature is low. Monitor for cold stress.");
        }

        if (data.humidity > 85) {
            analysis.push("💨 High humidity increases disease risk. Monitor closely.");
        }

        return analysis.join('\n') || "All parameters are within normal range.";
    };

    const getAIResponse = async (userMessage) => {
        // Check rule-based patterns first
        for (const [category, config] of Object.entries(ruleBasedResponses)) {
            const matched = config.keywords.some(keyword =>
                userMessage.toLowerCase().includes(keyword.toLowerCase())
            );
            if (matched) {
                return config.response();
            }
        }

        // AI-based conversational responses for general queries
        const aiResponses = {
            greeting: "Namaste! I'm here to help you with your farming needs. With 40 years of experience, I can guide you on crop health, disease management, and best practices. What would you like to know?",

            why_disease: `**Why Diseases Occur in Paddy:**\n\nBased on my 40 years of experience:\n\n1. **Environmental Factors:**\n   • Excessive humidity and moisture\n   • Poor air circulation\n   • Temperature fluctuations\n\n2. **Management Issues:**\n   • Over-crowding of plants\n   • Excessive nitrogen fertilizer\n   • Poor water management\n\n3. **Soil Conditions:**\n   • Nutrient imbalance\n   • Poor drainage\n   • Contaminated soil\n\n4. **Weather:**\n   • Prolonged wet conditions\n   • Sudden temperature changes\n\n💡 Prevention is always better than cure!`,

            best_practices: `**Best Farming Practices (40 Years Wisdom):**\n\n🌾 **Seed Selection:**\n• Use certified disease-resistant varieties\n• Treat seeds before sowing\n\n💧 **Water Management:**\n• Maintain 2-3 inch water level\n• Drain before fertilizer application\n• Avoid continuous flooding\n\n🌱 **Nutrient Management:**\n• Soil test every season\n• Split nitrogen application\n• Use organic matter\n\n🔍 **Monitoring:**\n• Daily field inspection\n• Early disease detection\n• Pest scouting\n\n👨‍🌾 **Remember:** Farming is not just science, it's an art learned through experience!`,

            default: "I'm here to help with agricultural advice. You can ask me about:\n• Disease identification\n• Treatment recommendations\n• Cost estimation\n• Preventive measures\n• IoT sensor readings\n• Best farming practices\n\nWhat would you like to know?"
        };

        // Simple pattern matching for AI responses
        const lowerMessage = userMessage.toLowerCase();

        if (lowerMessage.match(/hello|hi|hey|namaste|నమస్కారం/)) {
            return aiResponses.greeting;
        }
        if (lowerMessage.match(/why|reason|cause|ఎందుకు|కారణం/)) {
            return aiResponses.why_disease;
        }
        if (lowerMessage.match(/best|practice|advice|tip|సలహా|మంచి/)) {
            return aiResponses.best_practices;
        }

        return aiResponses.default;
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        // Add user message
        const userMsg = {
            type: 'user',
            text: inputMessage,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setInputMessage('');
        setIsTyping(true);

        // Simulate thinking delay
        setTimeout(async () => {
            const botResponse = await getAIResponse(inputMessage);
            const botMsg = {
                type: 'bot',
                text: botResponse,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
            setIsTyping(false);
        }, 1000);
    };

    const quickActions = [
        { label: 'Disease Status', query: 'What disease is affecting my crop?' },
        { label: 'Treatment', query: 'What medicine should I use?' },
        { label: 'Cost', query: 'How much will treatment cost?' },
        { label: 'Sensors', query: 'Show me sensor readings' },
        { label: 'Prevention', query: 'How to prevent diseases?' }
    ];

    return (
        <>
            {/* Floating Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-full shadow-2xl hover:shadow-green-500/50 hover:scale-110 transition-all duration-300 animate-bounce"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-fade-in">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="text-2xl">🌾</span>
                            </div>
                            <div>
                                <h3 className="font-bold">Agri Expert</h3>
                                <p className="text-xs opacity-90">40 Years Experience</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-white/20 p-2 rounded-full transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl p-3 ${msg.type === 'user'
                                        ? 'bg-green-500 text-white rounded-br-none'
                                        : 'bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-100'
                                    }`}>
                                    <p className="text-sm whitespace-pre-line">{msg.text}</p>
                                    <span className={`text-xs mt-1 block ${msg.type === 'user' ? 'text-green-100' : 'text-gray-400'}`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions */}
                    <div className="p-3 bg-white border-t border-gray-200">
                        <div className="flex flex-wrap gap-2 mb-2">
                            {quickActions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setInputMessage(action.query);
                                        setTimeout(() => handleSendMessage(), 100);
                                    }}
                                    className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full hover:bg-green-100 transition border border-green-200"
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-gray-200">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Ask me anything..."
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                            <button
                                onClick={handleSendMessage}
                                className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AgriChatbot;
