import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [userRooms, setUserRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserRooms();
  }, []);

  const fetchUserRooms = async () => {
    try {
      const response = await axios.get('http://107.21.8.204:3000/rooms', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUserRooms(response.data);
    } catch (error) {
      console.error('Error fetching user rooms:', error);
    }
  };

  const createRoom = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://107.21.8.204:3000/rooms', 
        { name: roomName },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.data.roomId) {
        fetchUserRooms();
        setRoomName('');
        alert('Sala creada exitosamente');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Error al crear la sala: ' + (error.response?.data?.error || error.message));
    }
  };

  const joinRoom = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://107.21.8.204:3000/rooms/join', 
        { code: joinCode },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.data.roomId) {
        navigate(`/room/${response.data.roomId}`);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Error al unirse a la sala: ' + (error.response?.data?.error || error.message));
    }
  };

  const copyRoomCode = async (code) => {
    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(code);
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      alert('Código de sala copiado al portapapeles');
    } catch (err) {
      console.error('Error al copiar el código:', err);
      fallbackCopyTextToClipboard(code);
    }
  };

  const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      const msg = successful ? 'exitoso' : 'fallido';
      console.log('Fallback: Copiado ' + msg);
      alert('Código de sala copiado al portapapeles');
    } catch (err) {
      console.error('Fallback: No se pudo copiar el texto: ', err);
      alert('No se pudo copiar el código. Por favor, cópielo manualmente.');
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-semibold mb-4">Mis Salas</h2>
        {userRooms.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {userRooms.map(room => (
              <li key={room.id} className="py-4 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">{room.name}</h3>
                  <p className="text-sm text-gray-500">Código: {room.code}</p>
                </div>
                <div>
                  <button
                    onClick={() => navigate(`/room/${room.id}`)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => copyRoomCode(room.code)}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Copiar Código
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No tienes salas creadas aún.</p>
        )}
      </div>

      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-semibold mb-4">Unirse a una sala</h2>
        <form onSubmit={joinRoom}>
          <div className="mb-4">
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Ingrese el código de la sala"
              required
            />
          </div>
          <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="submit">
            Unirse a la sala
          </button>
        </form>
      </div>

      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-semibold mb-4">Crear una sala nueva</h2>
        <form onSubmit={createRoom}>
          <div className="mb-4">
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Ingrese el nombre de la sala"
              required
            />
          </div>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="submit">
            Crear sala
          </button>
        </form>
      </div>
    </div>
  );
};

export default Home;