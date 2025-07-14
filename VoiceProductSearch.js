import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import axios from 'axios';
import './VoiceProductSearch.css';

function VoiceProductSearch({ onVoiceCommand }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [listening, setListening] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [fuse, setFuse] = useState(null);
  const [commandError, setCommandError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/products');
      setAllProducts(res.data);
      setResults(res.data);
      const fuseInstance = new Fuse(res.data, {
        keys: ['name'],
        threshold: 0.3
      });
      setFuse(fuseInstance);
    } catch (err) {
      console.error('Failed to fetch products for search:', err);
    }
  };

  const handleSearch = (value) => {
    setQuery(value);
    setCommandError('');
    if (fuse) {
      const matches = fuse.search(value).map(result => result.item);
      setResults(value ? matches : allProducts);
      speakSearchResult(matches);
    } else {
      setResults(value ? [] : allProducts);
    }
  };

  const speakSearchResult = (matches) => {
    if (matches.length > 0) {
      const product = matches[0];
      const message = `Found ${product.name}. Quantity: ${product.quantity}.`;
      speak(message);
    } else {
      speak("No products found.");
    }
  };

  const speak = (message) => {
    const speech = new SpeechSynthesisUtterance(message);
    window.speechSynthesis.speak(speech);
  };

  const processVoiceCommand = (voiceInput) => {
    const lowerCaseInput = voiceInput.toLowerCase();
    console.log("Processing voice command:", lowerCaseInput);
    setCommandError('');

    // --- Add Product Command ---
    const addProductRegex = /(?:add|create)\s+(?:product\s+)?(.+?)\s+(?:quantity\s+)?(\d+|\w+)\s+(?:price\s+)?(\d+(?:\.\d{1,2})?)(?:\s+expiry\s+(\d{4}-\d{2}-\d{2}))?/i;
    const addMatch = lowerCaseInput.match(addProductRegex);
    if (addMatch) {
      const name = addMatch[1].trim();
      let quantity = parseInt(addMatch[2], 10);

      if (isNaN(quantity)) {
        const numberWords = {
          'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
          'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
          'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
          'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
          'nineteen': 19, 'twenty': 20,
          'a': 1, 'an': 1, 'single': 1, 'couple': 2, 'few': 3, 'several': 5
        };
        quantity = numberWords[addMatch[2].toLowerCase()] || 1;
      }

      const price = parseFloat(addMatch[3]);
      const expiryDate = addMatch[4] || '';
      
      onVoiceCommand('addProduct', { name, quantity, price, expiryDate });
      return;
    }

    // --- Adjust Quantity Command ---
    const adjustQuantityRegex = /(reduce|decrease|lower|increase|add|raise)\s+(.+?)\s+(?:quantity\s+)?(?:by\s+)?(\d+|\w+)/i;
    const adjustMatch = lowerCaseInput.match(adjustQuantityRegex);
    if (adjustMatch) {
      const action = adjustMatch[1].toLowerCase();
      const productName = adjustMatch[2].trim();
      const amountStr = adjustMatch[3].toLowerCase();
      let amount = parseInt(amountStr, 10);

      if (isNaN(amount)) {
        const numberWords = {
          'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
          'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
          'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
          'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
          'nineteen': 19, 'twenty': 20,
          'a': 1, 'an': 1, 'single': 1, 'couple': 2, 'few': 3, 'several': 5
        };
        amount = numberWords[amountStr] || 1;
      }

      const normalizedAction = ['reduce', 'decrease', 'lower'].includes(action) ? 'reduce' : 'increase';
      
      onVoiceCommand('adjustQuantity', { 
        productName, 
        action: normalizedAction, 
        amount 
      });
      return;
    }

    // --- Delete Product Command ---
    const deleteRegex = /(?:remove|delete)\s+(.+)/i;
    const deleteMatch = lowerCaseInput.match(deleteRegex);
    if (deleteMatch) {
      const productName = deleteMatch[1].trim();
      onVoiceCommand('deleteProduct', { productName });
      return;
    }

    // If no specific command is recognized, treat as a general search term
    setCommandError(`Command not recognized. Try: "Add Milk 10 5.99" or "Reduce Milk by 2"`);
    handleSearch(voiceInput);
  };

  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Sorry, your browser does not support Speech Recognition.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListening(true);
    recognition.start();

    recognition.onresult = (event) => {
      const voiceInput = event.results[0][0].transcript;
      setQuery(voiceInput);
      processVoiceCommand(voiceInput);
      setListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Voice input failed:', event.error);
      setCommandError(`Voice input failed: ${event.error}. Please try again.`);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };
  };

  return (
    <div className="voice-search-container">
      <h3>Voice Control</h3>
      <div className="voice-search-input">
        <input
          type="text"
          value={query}
          placeholder="Speak a command or search term..."
          onChange={(e) => handleSearch(e.target.value)}
        />
        <button onClick={startVoiceSearch} className="voice-button">
          {listening ? 'Listening...' : '🎤'}
        </button>
      </div>
      
      {commandError && (
        <p className="command-error">{commandError}</p>
      )}
      
      {results.length > 0 && query && !commandError && (
        <ul className="search-results">
          {results.map((item) => (
            <li key={item.product_id}>{item.name}</li>
          ))}
        </ul>
      )}
      
      {query && results.length === 0 && !commandError && (
        <p className="no-results">No products found matching "{query}"</p>
      )}
      
      <div className="voice-help">
        <p>Try commands in this way:</p>
        <ul>
          <li>"Add Milk 10 5.99 2025-12-31"</li>
          <li>"Reduce Milk by 5"</li>
          <li>"Increase Milk by two"</li>
          <li>"Remove Milk"</li>
          <li>"Add a Milk" (adds 1)</li>
          <li>"Add couple Milk" (adds 2)</li>
        </ul>
      </div>
    </div>
  );
}

export default VoiceProductSearch;
