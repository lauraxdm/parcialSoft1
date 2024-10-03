import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import UMLClassDiagram from '../UMLClassDiagram';
import io from 'socket.io-client';

const Room = () => {
  const [roomData, setRoomData] = useState(null);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const response = await axios.get(`http://107.21.8.204:3000/rooms/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setRoomData(response.data);
      } catch (error) {
        console.error('Error fetching room data:', error);
        setError("Error al cargar los datos de la sala.");
      }
    };

    fetchRoomData();

    // Set up WebSocket connection
    const socket = io('http://107.21.8.204:3000/');
    socket.emit('joinRoom', id);

    socket.on('diagramUpdate', (updatedDiagram) => {
      setRoomData(prevData => ({...prevData, diagramData: updatedDiagram}));
    });

    return () => socket.close();
  }, [id]);

  if (error) {
    return <div>{error}</div>;
  }

  if (!roomData) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white shadow-md px-4 py-2 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Sala: {roomData.name}</h1>
        <button 
          onClick={() => navigate('/')}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Volver al inicio
        </button>
      </div>
      <div className="flex-grow overflow-hidden">
        <UMLClassDiagram roomId={id} initialDiagram={roomData.diagramData} />
      </div>
    </div>
  );
};

export default Room;