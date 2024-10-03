import React, { useState } from 'react';

const CardinalityEditor = ({ link, onSave, onCancel }) => {
  const [fromText, setFromText] = useState(link.fromText || '');
  const [toText, setToText] = useState(link.toText || '');

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
      zIndex: 1000
    }}>
      <h3>Editar Cardinalidad</h3>
      <div>
        <label>Desde: </label>
        <input
          type="text"
          value={fromText}
          onChange={(e) => setFromText(e.target.value)}
          placeholder="ej. 0..1, 1..*, 1"
        />
      </div>
      <div>
        <label>Hasta: </label>
        <input
          type="text"
          value={toText}
          onChange={(e) => setToText(e.target.value)}
          placeholder="ej. 0..1, 1..*, 1"
        />
      </div>
      <button onClick={() => onSave(fromText, toText)}>Guardar</button>
      <button onClick={onCancel}>Cancelar</button>
    </div>
  );
};

export default CardinalityEditor;