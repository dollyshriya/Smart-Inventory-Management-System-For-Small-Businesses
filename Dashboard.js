import React, { useState } from 'react';
import Inventory from './components/Inventory';
import Profile from './components/Profile';
import Notifications from './components/Notifications';
import Report from './components/Report'; 

const Dashboard = ({ username, shopName, inventoryData }) => {
  const [activeFeature, setActiveFeature] = useState('welcome');

  const styles = {
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      backgroundColor: '#f9fafb',
    },
    header: {
      height: '60px',
      backgroundColor: '#10b981',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      fontSize: '20px',
      fontWeight: 600,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      flexShrink: 0,
      justifyContent: 'center',
      position: 'relative',
    },
    headerText: {
      fontSize: '22px',
      fontWeight: 'bold',
      color: '#ffffff',
    },
    userInfo: {
      position: 'absolute',
      right: '20px',
      fontSize: '14px',
      color: '#e0f2f1',
    },
    body: {
      display: 'flex',
      flexGrow: 1,
    },
    sidebar: {
      width: '250px',
      backgroundColor: '#f3f4f6',
      borderRight: '1px solid #e5e7eb',
      padding: '24px 16px',
      boxSizing: 'border-box',
    },
    sidebarHeading: {
      fontSize: '20px',
      marginBottom: '20px',
      color: '#111827',
      fontWeight: 600,
      textAlign: 'center',
    },
    sidebarItem: {
      padding: '12px 20px',
      marginBottom: '12px',
      cursor: 'pointer',
      backgroundColor: '#e5e7eb',
      color: '#374151',
      borderRadius: '8px',
      transition: 'background 0.2s ease-in-out',
    },
    activeSidebarItem: {
      backgroundColor: '#10b981', 
      color: 'white',
      fontWeight: 600,
    },
    content: {
      flexGrow: 1,
      backgroundColor: '#ffffff',
      padding: '30px',
      overflowY: 'auto',
    },
    welcomeMessage: {
      fontSize: '24px',
      textAlign: 'center',
      marginTop: '20px',
      color: '#374151',
    },
  };

  const features = ['profile', 'inventory', 'notifications', 'report'];

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <span style={styles.headerText}>Smart Inventory Management System</span>
        <span style={styles.userInfo}>{username} - {shopName}</span>
      </header>

      <div style={styles.body}>
        <aside style={styles.sidebar}>
          <div style={styles.sidebarHeading}>Dashboard</div>
          {features.map((feature) => (
            <div
              key={feature}
              style={{
                ...styles.sidebarItem,
                ...(activeFeature === feature ? styles.activeSidebarItem : {}),
              }}
              onClick={() => setActiveFeature(feature)}
            >
              {feature.charAt(0).toUpperCase() + feature.slice(1)}
            </div>
          ))}
          <div
            style={{
              ...styles.sidebarItem,
              backgroundColor: '#f87171',
              color: '#fff',
              fontWeight: 'bold',
            }}
            onClick={() => window.location.reload()}
          >
            Logout
          </div>
        </aside>

        <main style={styles.content}>
          {activeFeature === 'welcome' && (
            <div style={styles.welcomeMessage}>
              <h2>Welcome to the Smart Inventory Management System</h2>
            </div>
          )}
          {activeFeature === 'profile' && <Profile />}
          {activeFeature === 'inventory' && <Inventory />}
          {activeFeature === 'notifications' && <Notifications />}
          {activeFeature === 'report' && <Report inventoryData={inventoryData} />} {/* Correctly passing inventoryData */}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
