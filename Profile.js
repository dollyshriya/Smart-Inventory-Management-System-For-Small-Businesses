import React, { useEffect, useState } from 'react';
//import './styles.css';

const Profile = () => {
  const [profileData, setProfileData] = useState({
    id: '',
    username: '',
    phone: '',
    shopName: '',
  });

  const [message, setMessage] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    const phone = localStorage.getItem('phone');
    const shopName = localStorage.getItem('shopName');

    if (id && username && phone && shopName) {
      setProfileData({ id, username, phone, shopName });
    }
  }, []);

  const handleUpdate = async () => {
    try {
      const res = await fetch(`http://localhost:5000/profile/${profileData.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: profileData.phone,
          shopName: profileData.shopName,
        }),
      });
  
      const data = await res.json();
  
      if (res.ok) {
        setMessage(data.message);
  
        // Update localStorage
        localStorage.setItem('username', profileData.username);
        localStorage.setItem('phone', profileData.phone);
        localStorage.setItem('shopName', profileData.shopName);
      } else {
        setMessage(data.message || 'Update failed');
      }
    } catch (err) {
      console.error(err);
      setMessage('Server error');
    } 
  };
  
  return (
    <div className="profile-wrapper">
      <h2>Profile</h2>
      <input
        type="text"
        value={profileData.username}
        onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
        placeholder="Username"
      />
      <input
        type="text"
        value={profileData.phone}
        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
        placeholder="Phone"
      />
      <input
        type="text"
        value={profileData.shopName}
        onChange={(e) => setProfileData({ ...profileData, shopName: e.target.value })}
        placeholder="Shop Name"
      />
      <button onClick={handleUpdate}>Update Profile</button>
      <p className="message">{message}</p>
    </div>
  );
};

export default Profile;
