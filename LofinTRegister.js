import React, { useState } from 'react';
import './styles.css';
import Dashboard from './Dashboard';

const LoginRegister = () => {
  const [formType, setFormType] = useState('register');
  const [message, setMessage] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);

  const handleRegister = async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phone').value;
    const shopName = document.getElementById('shopName').value;

    if (username && password && phone && shopName) {
      try {
        const res = await fetch('http://localhost:5000/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, phone, shopName }),
        });

        const data = await res.json();

        if (res.ok) {
          setMessage(data.message);
          setFormType('login');
        } else {
          setMessage(data.message || 'Registration failed');
        }
      } catch (err) {
        console.error('Error:', err);
        setMessage('Server error');
      }
    } else {
      setMessage('Please fill in all fields.');
    }
  };

  const handleLogin = async () => {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    if (username && password) {
      try {
        const res = await fetch('http://localhost:5000/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (res.ok) {
          setLoginMessage(data.message);
          setIsLoggedIn(true);

          // Save to localStorage
          localStorage.setItem('userId', data.user.id);
          localStorage.setItem('username', data.user.username);
          localStorage.setItem('phone', data.user.phone);
          localStorage.setItem('shopName', data.user.shopName);

          setLoggedInUser({
            username: data.user.username,
            shopName: data.user.shopName,
          });

          setFormType('dashboard');
        } else {
          setLoginMessage(data.message || 'Login failed');
        }
      } catch (err) {
        console.error('Error:', err);
        setLoginMessage('Server error');
      }
    } else {
      setLoginMessage('Please fill in both fields.');
    }
  };

  if ((formType === 'register' || formType === 'login') && !isLoggedIn) {
    return (
      <div className="auth-wrapper">
        <div className="container">
          {formType === 'register' && (
            <div>
              <input type="text" id="username" placeholder="Username" />
              <input type="password" id="password" placeholder="Password" />
              <input type="text" id="phone" placeholder="Phone Number" />
              <input type="text" id="shopName" placeholder="Shop Name" />
              <button onClick={handleRegister}>Register</button>
              <p className="message">{message}</p>
              <p>
                Already have an account?{' '}
                <span className="link" onClick={() => setFormType('login')}>
                  Login here
                </span>
              </p>
            </div>
          )}

          {formType === 'login' && (
            <div>
              <input type="text" id="loginUsername" placeholder="Username" />
              <input type="password" id="loginPassword" placeholder="Password" />
              <button onClick={handleLogin}>Login</button>
              <p className="message">{loginMessage}</p>
              <p>
                Don&apos;t have an account?{' '}
                <span className="link" onClick={() => setFormType('register')}>
                  Register here
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (formType === 'dashboard' && isLoggedIn && loggedInUser) {
    return <Dashboard username={loggedInUser.username} shopName={loggedInUser.shopName} />;
  }

  return null;
};

export default LoginRegister;
