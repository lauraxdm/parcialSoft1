import React, { useState } from 'react';

const RelationshipSelector = ({ handleCreateRelation, onCancel }) => {
  const [relationType, setRelationType] = useState('');
  const [fromCardinality, setFromCardinality] = useState('0..1');
  const [toCardinality, setToCardinality] = useState('0..1');

  const handleSubmit = () => {
    if (relationType === 'Asociación') {
      handleCreateRelation(relationType, fromCardinality, toCardinality);
    } else {
      handleCreateRelation(relationType);
    }
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
      zIndex: 1000
    }}>
      <h3>Seleccionar tipo de relación</h3>
      <select value={relationType} onChange={(e) => setRelationType(e.target.value)}>
        <option value="">Seleccione un tipo</option>
        <option value="Generalización">Herencia</option>
        <option value="Composición">Composición</option>
        <option value="Agregación">Agregación</option>
        <option value="Asociación">Asociación</option>
      </select>
      {relationType === 'Asociación' && (
        <>
          <div>
            <label>Cardinalidad (desde): </label>
            <input
              type="text"
              value={fromCardinality}
              onChange={(e) => setFromCardinality(e.target.value)}
              placeholder="ej. 0..1, 1..*, 1"
            />
          </div>
          <div>
            <label>Cardinalidad (hasta): </label>
            <input
              type="text"
              value={toCardinality}
              onChange={(e) => setToCardinality(e.target.value)}
              placeholder="ej. 0..1, 1..*, 1"
            />
          </div>
        </>
      )}
      <button onClick={handleSubmit} disabled={!relationType}>Crear Relación</button>
      <button onClick={onCancel}>Cancelar</button>
    </div>
  );
};

export default RelationshipSelector;