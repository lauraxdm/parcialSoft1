import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const Toolbox = ({ diagram, roomId, onLoadDiagram }) => {
  const [newClassName, setNewClassName] = useState('');
  const [diagrams, setDiagrams] = useState([]);
  const [showDiagramList, setShowDiagramList] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://107.21.8.204:3000');
    setSocket(newSocket);
    newSocket.emit('joinRoom', roomId);

    return () => newSocket.close();
  }, [roomId]);

  const handleCreateClass = () => {
    if (!newClassName.trim() || !diagram) return;

    const newKey = diagram.model.nodeDataArray.length + 1;
    const newNode = {
      key: newKey,
      name: newClassName,
      loc: "100 100",
      properties: [
        { name: "id", type: "SERIAL", visibility: "private", isKey: true }
      ]
    };

    diagram.startTransaction('Add Class');
    diagram.model.addNodeData(newNode);
    diagram.commitTransaction('Add Class');

    setNewClassName('');

    // Emit diagram update
    if (socket) {
      socket.emit('diagramUpdate', { roomId, diagram: diagram.model.toJson() });
    }
  };

  const handleGenerateORM = async () => {
    try {
      const diagramData = diagram.model.toJson();
      const response = await axios.post('http://107.21.8.204:3000/generate-orm', { diagramData }, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'spring-boot-orm.zip');
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating ORM:', error);
      alert('Error al generar el ORM. Por favor, intente de nuevo.');
    }
  };

  const handleSaveDiagram = async () => {
    if (!roomId) {
      alert('Error: No se ha especificado un ID de sala válido');
      return;
    }
    try {
      const diagramData = diagram.model.toJson();
      await axios.put(`http://107.21.8.204:3000/rooms/${roomId}/diagram`, { diagramData }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Diagrama guardado exitosamente');
      
      // Emit diagram update
      if (socket) {
        socket.emit('diagramUpdate', { roomId, diagram: diagramData });
      }
    } catch (error) {
      console.error('Error saving diagram:', error);
      alert('Error al guardar el diagrama. Por favor, intente de nuevo.');
    }
  };

  const handleLoadDiagrams = async () => {
    try {
      const response = await axios.get('http://107.21.8.204:3000/rooms', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDiagrams(response.data);
      setShowDiagramList(true);
    } catch (error) {
console.error('Error loading diagrams:', error);
      alert('Error al cargar los diagramas. Por favor, intente de nuevo.');
    }
  };

  const handleSelectDiagram = async (roomId) => {
    try {
      const response = await axios.get(`http://107.21.8.204:3000/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.diagramData) {
        onLoadDiagram(response.data.diagramData);
        setShowDiagramList(false);
        
        // Emit diagram update
        if (socket) {
          socket.emit('diagramUpdate', { roomId, diagram: response.data.diagramData });
        }
      } else {
        alert('No hay diagrama guardado para esta sala');
      }
    } catch (error) {
      console.error('Error loading diagram:', error);
      alert('Error al cargar el diagrama. Por favor, intente de nuevo.');
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 m-2 w-64">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">Toolbox</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la nueva clase
          </label>
          <input
            id="className"
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="Nombre de la clase"
            className="w-full px-3 py-2 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-indigo-100 focus:border-indigo-300"
          />
        </div>
        <button
          onClick={handleCreateClass}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 ease-in-out"
        >
          Crear Clase
        </button>
        <button
          onClick={handleGenerateORM}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 ease-in-out"
        >
          Generar ORM
        </button>
        <button
          onClick={handleSaveDiagram}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 ease-in-out"
        >
          Guardar Diagrama
        </button>
        <button
          onClick={handleLoadDiagrams}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 ease-in-out"
        >
          Cargar Diagrama
        </button>
      </div>
      {showDiagramList && (
        <div className="mt-4">
          <h4 className="text-md font-semibold mb-2">Diagramas guardados:</h4>
          <ul className="space-y-2">
            {diagrams.map((room) => (
              <li key={room.id}>
                <button
                  onClick={() => handleSelectDiagram(room.id)}
                  className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
                >
                  {room.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Toolbox;