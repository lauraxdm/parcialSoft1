import React, { useEffect, useRef, useState } from 'react';
import * as go from 'gojs';
import Toolbox from './Toolbox';
import ClassEditor from './ClassEditor';
import RelationshipSelector from './RelationshipSelector';
import CardinalityEditor from './CardinalityEditor';
import { initializeDiagram } from './diagramUtils';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';

const UMLClassDiagram = () => {
  const { id: roomId } = useParams();
  const diagramRef = useRef(null);
  const [diagram, setDiagram] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [showRelationshipSelector, setShowRelationshipSelector] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const socketRef = useRef();

  useEffect(() => {
    if (!diagramRef.current) return;

    const myDiagram = initializeDiagram(
      diagramRef.current,
      handleClassClick,
      handleClassDoubleClick,
      handleLinkDoubleClick
    );
    setDiagram(myDiagram);

    // Set up WebSocket connection
    socketRef.current = io('http://107.21.8.204:3000');
    socketRef.current.emit('joinRoom', roomId);

    socketRef.current.on('diagramUpdate', (updatedDiagram) => {
      if (myDiagram) {
        myDiagram.model = go.Model.fromJson(updatedDiagram);
      }
    });

    return () => {
      myDiagram.div = null;
      socketRef.current.disconnect();
    };
  }, [roomId]);

  const handleClassClick = (e, classData) => {
    if (e.control || e.meta) {
      setSelectedClasses(prevSelected => {
        if (prevSelected.length === 2) {
          return [classData];
        }
        if (prevSelected.find(c => c.key === classData.key)) {
          return prevSelected.filter(c => c.key !== classData.key);
        }
        const newSelected = [...prevSelected, classData];
        if (newSelected.length === 2) {
          setShowRelationshipSelector(true);
        }
        return newSelected;
      });
    }
  };

  const handleClassDoubleClick = (classData) => {
    setEditingClass(classData);
  };

  const handleLinkDoubleClick = (linkData) => {
    if (linkData.relationship === 'Asociación') {
      setEditingLink(linkData);
    }
  };

  const handleSaveClass = () => {
    if (!editingClass || !diagram) return;

    diagram.startTransaction('Edit Class');
    const node = diagram.findNodeForKey(editingClass.key);
    if (node) {
      diagram.model.setDataProperty(node.data, "name", editingClass.name);
      diagram.model.setDataProperty(node.data, "properties", [...editingClass.properties]);
    }
    diagram.commitTransaction('Edit Class');

    setEditingClass(null);
    
    // Emit diagram update
    socketRef.current.emit('diagramUpdate', { roomId, diagram: diagram.model.toJson() });
  };

  const handleCreateRelation = (relationType, fromCardinality, toCardinality) => {
    if (selectedClasses.length !== 2 || !diagram) return;

    diagram.startTransaction('Add Relation');
    diagram.model.addLinkData({ 
      from: selectedClasses[0].key, 
      to: selectedClasses[1].key, 
      relationship: relationType,
      fromText: relationType === 'Asociación' ? fromCardinality : '',
      toText: relationType === 'Asociación' ? toCardinality : ''
    });
    diagram.commitTransaction('Add Relation');

    setSelectedClasses([]);
    setShowRelationshipSelector(false);
    
    // Emit diagram update
    socketRef.current.emit('diagramUpdate', { roomId, diagram: diagram.model.toJson() });
  };

  const handleSaveCardinality = (fromText, toText) => {
    if (!editingLink || !diagram) return;

    diagram.startTransaction('Edit Cardinality');
    const link = diagram.findLinkForData(editingLink);
    if (link) {
      diagram.model.setDataProperty(link.data, "fromText", fromText);
      diagram.model.setDataProperty(link.data, "toText", toText);
    }
    diagram.commitTransaction('Edit Cardinality');

    setEditingLink(null);
    
    // Emit diagram update
    socketRef.current.emit('diagramUpdate', { roomId, diagram: diagram.model.toJson() });
  };

  const handleLoadDiagram = (diagramData) => {
    if (diagram) {
      diagram.model = go.Model.fromJson(diagramData);
      
      // Emit diagram update
      socketRef.current.emit('diagramUpdate', { roomId, diagram: diagramData });
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <Toolbox diagram={diagram} roomId={roomId} onLoadDiagram={handleLoadDiagram} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div ref={diagramRef} style={{ width: '100%', height: '535px', border: '1px solid black' }}></div>
      </div>
      {editingClass && (
        <ClassEditor
          editingClass={editingClass}
          setEditingClass={setEditingClass}
          handleSaveClass={handleSaveClass}
        />
      )}
      {selectedClasses.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid black'
        }}>
          <p>Clases seleccionadas: {selectedClasses.map(c => c.name).join(', ')}</p>
          <p>{selectedClasses.length === 1 ? 'Selecciona otra clase para crear una relación' : 'Presiona "Crear Relación" para continuar'}</p>
          <button onClick={() => {
            setSelectedClasses([]);
            setShowRelationshipSelector(false);
          }}>Cancelar</button>
        </div>
      )}
      {showRelationshipSelector && (
        <RelationshipSelector
          handleCreateRelation={handleCreateRelation}
          onCancel={() => {
            setShowRelationshipSelector(false);
            setSelectedClasses([]);
          }}
        />
      )}
      {editingLink && (
        <CardinalityEditor
          link={editingLink}
          onSave={handleSaveCardinality}
          onCancel={() => setEditingLink(null)}
        />
      )}
    </div>
  );
};

export default UMLClassDiagram;