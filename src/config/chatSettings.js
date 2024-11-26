export const defaultSettings = {
  bot: {
    persona: 'memer',
    customPrompt: '',
  },
  chat: {
    responseFrequency: 'medium',
    emoteUsage: 'high'
  }
};

export const responseFrequencyOptions = [
  { value: 'high', label: 'High (respond to most messages)' },
  { value: 'medium', label: 'Medium (balanced)' },
  { value: 'low', label: 'Low (minimal responses)' },
];

export const emoteUsageOptions = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];


// Helper function to load settings from localStorage
export const loadSettings = () => {
  const savedSettings = localStorage.getItem('botSettings');
  return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
};

// Helper function to save settings to localStorage
export const saveSettings = (settings) => {
  localStorage.setItem('botSettings', JSON.stringify(settings));
}; 