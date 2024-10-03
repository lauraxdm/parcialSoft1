import * as go from 'gojs';

export function initializeDiagram(diagramDiv, handleClassClick, handleClassDoubleClick, handleLinkDoubleClick) {
  const $ = go.GraphObject.make;

  const myDiagram = $(go.Diagram, diagramDiv, {
    'undoManager.isEnabled': true,
    model: new go.GraphLinksModel({
      linkKeyProperty: 'key',
      nodeDataArray: [],
      linkDataArray: []
    }),
    'animationManager.isEnabled': false,
    'undoManager.isEnabled': true,
    'clickCreatingTool.archetypeNodeData': { text: 'Nueva Clase', properties: [] },
    'clickCreatingTool.insertPart': function(loc) {
      const newNodeData = {
        key: 'Clase' + this.diagram.model.nodeDataArray.length,
        name: 'Nueva Clase',
        properties: [],
        loc: go.Point.stringify(loc)
      };
      this.diagram.model.addNodeData(newNodeData);
      return this.diagram.findNodeForData(newNodeData);
    }
  });

  function convertVisibility(v) {
    switch (v) {
      case 'public': return '+';
      case 'private': return '-';
      case 'protected': return '#';
      case 'package': return '~';
      default: return v;
    }
  }

  const propertyTemplate = $(go.Panel, "Horizontal",
    $(go.TextBlock,
      { isMultiline: false, editable: false, width: 12 },
      new go.Binding("text", "visibility", convertVisibility)),
    $(go.TextBlock,
      { isMultiline: false, editable: false },
      new go.Binding("text", "name"),
      new go.Binding("isUnderline", "isKey")),
    $(go.TextBlock, "",
      new go.Binding("text", "type", t => t ? ": " : "")),
    $(go.TextBlock,
      { isMultiline: false, editable: false },
      new go.Binding("text", "type")),
    $(go.TextBlock,
      { isMultiline: false, editable: false },
      new go.Binding("text", "default", s => s ? " = " + s : ""))
  );

  myDiagram.nodeTemplate =
    $(go.Node, "Auto",
      {
        locationSpot: go.Spot.Center,
        fromSpot: go.Spot.AllSides,
        toSpot: go.Spot.AllSides
      },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, { fill: "lightyellow" }),
      $(go.Panel, "Table",
        { defaultRowSeparatorStroke: "black" },
        $(go.TextBlock,
          {
            row: 0, columnSpan: 2, margin: 3, alignment: go.Spot.Center,
            font: "bold 12pt sans-serif",
            isMultiline: false, editable: true
          },
          new go.Binding("text", "name").makeTwoWay()),
        $(go.TextBlock, "Properties",
          { row: 1, font: "italic 10pt sans-serif" },
          new go.Binding("visible", "visible", v => !v).ofObject("PROPERTIES")),
        $(go.Panel, "Vertical",
          {
            name: "PROPERTIES",
            row: 1,
            margin: 3,
            stretch: go.GraphObject.Fill,
            defaultAlignment: go.Spot.Left,
            background: "lightyellow",
            itemTemplate: propertyTemplate
          },
          new go.Binding("itemArray", "properties")),
        $("PanelExpanderButton", "PROPERTIES",
          { row: 1, column: 1, alignment: go.Spot.TopRight, visible: false },
          new go.Binding("visible", "properties", arr => arr.length > 0))
      ),
      {
        click: (e, node) => handleClassClick(e, node.data),
        doubleClick: (e, node) => handleClassDoubleClick(node.data)
      }
    );

  myDiagram.linkTemplate = $(go.Link,
    {
      routing: go.Link.AvoidsNodes,
      curve: go.Link.JumpOver,
      corner: 5,
      relinkableFrom: true,
      relinkableTo: true,
      doubleClick: (e, link) => handleLinkDoubleClick(link.data)
    },
    new go.Binding("points").makeTwoWay(),
    $(go.Shape, { strokeWidth: 1.5 }),
    $(go.Shape, { 
      toArrow: "Triangle", 
      stroke: "black",
      fill: "white", 
      scale: 1.2, 
      visible: false 
    },
    new go.Binding("visible", "relationship", r => r === "Generalización")),
    $(go.Shape, { 
      fromArrow: "Diamond", 
      stroke: "black", 
      fill: "white", 
      scale: 1.2, 
      visible: false 
    },
    new go.Binding("visible", "relationship", r => r === "Agregación")),
    $(go.Shape, { 
      fromArrow: "Diamond", 
      stroke: "black", 
      fill: "black", 
      scale: 1.2, 
      visible: false 
    },
    new go.Binding("visible", "relationship", r => r === "Composición")),
    $(go.Panel, "Auto",
      {
        segmentIndex: 0,
        segmentOffset: new go.Point(10, 10),
        visible: false
      },
      new go.Binding("visible", "relationship", r => r === "Asociación"),
      $(go.Shape, "Rectangle", { fill: "white", stroke: null }),
      $(go.TextBlock, { 
        editable: true,
        background: "white", 
        margin: 2
      }, new go.Binding("text", "fromText").makeTwoWay())
    ),
    $(go.Panel, "Auto",
      {
        segmentIndex: -1,
        segmentOffset: new go.Point(-10, 10),
        visible: false
      },
      new go.Binding("visible", "relationship", r => r === "Asociación"),
      $(go.Shape, "Rectangle", { fill: "white", stroke: null }),
      $(go.TextBlock, { 
        editable: true,
        background: "white", 
        margin: 2
      }, new go.Binding("text", "toText").makeTwoWay())
    )
  );

  myDiagram.model.makeUniqueKeyFunction = (model, data) => {
    let k = data.name || "";
    return model.findNodeDataForKey(k) ? k + (model.nodeDataArray.length + 1) : k;
  };

  return myDiagram;
}