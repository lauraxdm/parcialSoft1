import React, { useEffect } from 'react';
import io from 'socket.io-client';

const postgresqlTypes = [
  'INTEGER',
  'BIGINT',
  'SMALLINT',
  'DECIMAL',
  'NUMERIC',
  'REAL',
  'DOUBLE PRECISION',
  'SERIAL',
  'BIGSERIAL',
  'VARCHAR',
  'CHAR',
  'TEXT',
  'DATE',
  'TIME',
  'TIMESTAMP',
  'BOOLEAN',
  'UUID',
  'JSON',
  'JSONB',
  'ARRAY'
];

const ClassEditor = ({ editingClass, setEditingClass, handleSaveClass, roomId }) => {
  useEffect(() => {
    const socket = io('http://107.21.8.204:3000');
    socket.emit('joinRoom', roomId);

    return () => socket.close();
  }, [roomId]);

  const emitUpdate = () => {
    const socket = io('http://107.21.8.204:3000');
    socket.emit('diagramUpdate', { roomId, diagram: JSON.stringify(editingClass) });
  };

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '20px',
      border: '1px solid black',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      zIndex: 1000,
      maxHeight: '80%',
      overflowY: 'auto'
    }}>
      <h3>Editar Clase</h3>
      <input
        type="text"
        value={editingClass.name}
        onChange={(e) => {
          setEditingClass({ ...editingClass, name: e.target.value });
          emitUpdate();
        }}
      />
      <h4>Propiedades</h4>
      {editingClass.properties.map((prop, index) => (
        <div key={index}>
          <input
            type="text"
            value={prop.name}
            onChange={(e) => {
              const newProps = [...editingClass.properties];
              newProps[index].name = e.target.value;
              setEditingClass({ ...editingClass, properties: newProps });
              emitUpdate();
            }}
          />
          <select
            value={prop.type}
            onChange={(e) => {
              const newProps = [...editingClass.properties];
              newProps[index].type = e.target.value;
              setEditingClass({ ...editingClass, properties: newProps });
              emitUpdate();
            }}
          >
            {postgresqlTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={prop.visibility}
            onChange={(e) => {
              const newProps = [...editingClass.properties];
              newProps[index].visibility = e.target.value;
              setEditingClass({ ...editingClass, properties: newProps });
              emitUpdate();
            }}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="protected">Protected</option>
          </select>
          <input
            type="checkbox"
            checked={prop.isKey}
            onChange={(e) => {
              const newProps = [...editingClass.properties];
              newProps[index].isKey = e.target.checked;
              setEditingClass({ ...editingClass, properties: newProps });
              emitUpdate();
            }}
          /> Primary Key
          <button onClick={() => {
            const newProps = editingClass.properties.filter((_, i) => i !== index);
            setEditingClass({ ...editingClass, properties: newProps });
            emitUpdate();
          }}>Eliminar</button>
        </div>
      ))}
      <button onClick={() => {
        const newProps = [...editingClass.properties, { name: "newProperty", type: "INTEGER", visibility: "public", isKey: false }];
        setEditingClass({ ...editingClass, properties: newProps });
        emitUpdate();
      }}>Añadir Propiedad</button>

      <div style={{ marginTop: '20px' }}>
        <button onClick={() => {
          handleSaveClass();
          emitUpdate();
        }}>Guardar</button>
        <button onClick={() => setEditingClass(null)}>Cancelar</button>
      </div>
    </div>
  );
};

export default ClassEditor;