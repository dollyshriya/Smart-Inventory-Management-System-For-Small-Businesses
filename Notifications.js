import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios.get('http://localhost:5000/api/notifications')
      .then((res) => {
        setNotifications(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching notifications:', err);
        setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="p-4">Loading notifications...</p>;
  if (error) return <p className="p-4 text-red-500">
  <span role="img" aria-label="cross mark">❌</span> Failed to load notifications.
</p>


  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">
        <span role="img" aria-label="bell">🔔</span> Notifications
      </h2>
      {notifications.length === 0 ? (
        <p className="text-green-600">
          <span role="img" aria-label="check mark">✅</span> All products are sufficiently stocked.
        </p>
      ) : (
        <ul className="bg-white shadow-md rounded-lg p-4 space-y-2">
          {notifications.map((item) => (
            <li key={item.id} className="text-red-600 text-sm border-b border-gray-200 pb-2">
              {item.message}
              <div className="text-xs text-gray-500">
                {new Date(item.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
