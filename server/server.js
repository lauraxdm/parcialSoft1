const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const fse = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const http = require('http');
const socketIo = require('socket.io');
const pluralize = require('pluralize');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://uml-class-diagrammer-app.s3-website-us-east-1.amazonaws.com",
    methods: ["GET", "POST"]
  }
});
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
}
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.get('/',async (req, res) => res.send('HOLA MUNDO'));

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );
    res.status(201).json({ message: 'Usuario registrado exitosamente', userId: result.rows[0].id });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario', details: error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET);
        res.json({ token });
      } else {
        res.status(400).json({ error: 'Contraseña incorrecta' });
      }
    } else {
      res.status(400).json({ error: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión', details: error.message });
  }
});

app.get('/user', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error al obtener información del usuario:', error);
    res.status(500).json({ error: 'Error al obtener información del usuario', details: error.message });
  }
});

app.post('/rooms', authenticateToken, async (req, res) => {
  try {
    console.log('Solicitud recibida para crear sala:', req.body);
    const { name } = req.body;
    const code = uuidv4();
    console.log('Generado código de sala:', code);

    const result = await pool.query(
      'INSERT INTO rooms (name, code, owner_id) VALUES ($1, $2, $3) RETURNING id, code',
      [name, code, req.user.userId]
    );
    console.log('Sala creada:', result.rows[0]);
    
    await pool.query(
      'INSERT INTO room_users (room_id, user_id) VALUES ($1, $2)',
      [result.rows[0].id, req.user.userId]
    );
    console.log('Usuario añadido a la sala');

    res.status(201).json({ roomId: result.rows[0].id, code: result.rows[0].code });
  } catch (error) {
    console.error('Error al crear sala:', error);
    res.status(500).json({ error: 'Error al crear la sala', details: error.message });
  }
});

app.get('/rooms', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT r.id, r.name, r.code FROM rooms r JOIN room_users ru ON r.id = ru.room_id WHERE ru.user_id = $1',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener las salas del usuario:', error);
    res.status(500).json({ error: 'Error al obtener las salas del usuario', details: error.message });
  }
});

app.get('/rooms/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userAccess = await pool.query(
      'SELECT * FROM room_users WHERE room_id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    
    if (userAccess.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a esta sala' });
    }

    const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      const room = result.rows[0];
      res.json({
        id: room.id,
        name: room.name,
        code: room.code,
        diagramData: room.diagram_data
      });
    } else {
      res.status(404).json({ error: 'Sala no encontrada' });
    }
  } catch (error) {
    console.error('Error al obtener información de la sala:', error);
    res.status(500).json({ error: 'Error al obtener información de la sala', details: error.message });
  }
});

app.post('/rooms/join', authenticateToken, async (req, res) => {
  const { code } = req.body;
  try {
    const roomResult = await pool.query('SELECT id FROM rooms WHERE code = $1', [code]);
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sala no encontrada' });
    }
    const roomId = roomResult.rows[0].id;

    const userInRoomResult = await pool.query(
      'SELECT * FROM room_users WHERE room_id = $1 AND user_id = $2',
      [roomId, req.user.userId]
    );
    if (userInRoomResult.rows.length > 0) {
      return res.json({ roomId });
    }

    await pool.query(
      'INSERT INTO room_users (room_id, user_id) VALUES ($1, $2)',
      [roomId, req.user.userId]
    );

    res.json({ roomId });
  } catch (error) {
    console.error('Error al unirse a la sala:', error);
    res.status(500).json({ error: 'Error al unirse a la sala', details: error.message });
  }
});

app.put('/rooms/:id/diagram', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { diagramData } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'ID de sala no proporcionado' });
    }

    const userAccess = await pool.query(
      'SELECT * FROM room_users WHERE room_id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    
    if (userAccess.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta sala' });
    }
    await pool.query('UPDATE rooms SET diagram_data = $1 WHERE id = $2', [diagramData, id]);
    io.to(id).emit('diagramUpdate', diagramData);
    res.json({ message: 'Diagrama guardado y actualizado exitosamente' });
  } catch (error) {
    console.error('Error al guardar el diagrama:', error);
    res.status(500).json({ error: 'Error al guardar el diagrama', details: error.message });
  }
});

function generateJavaClass(node, diagram) {
  let imports = new Set(['import javax.persistence.*;', 'import java.util.*;']);
  let classContent = `@Entity\n`;
  classContent += `public class ${node.name} {\n\n`;
  
  node.properties.forEach(prop => {
    if (prop.isKey) {
      classContent += '    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n';
    }
    classContent += `    private ${prop.type} ${prop.name};\n\n`;
  });
  
  diagram.linkDataArray.forEach(link => {
    if (link.from === node.key || link.to === node.key) {
      const otherNode = diagram.nodeDataArray.find(n => n.key === (link.from === node.key ? link.to : link.from));
      if (otherNode) {
        const isSource = link.from === node.key;
        const sourceCardinality = link.fromText || "0..*";
        const targetCardinality = link.toText || "0..*";
        
        switch (link.relationship) {
          case 'Asociación':
            if (isSource) {
              if (targetCardinality.endsWith("*")) {
                imports.add('import java.util.List;');
                classContent += `    @ManyToMany\n    private List<${otherNode.name}> ${pluralize(otherNode.name.toLowerCase())};\n\n`;
              } else {
                classContent += `    @ManyToOne\n    private ${otherNode.name} ${otherNode.name.toLowerCase()};\n\n`;
              }
            } else {
              if (sourceCardinality.endsWith("*")) {
                imports.add('import java.util.List;');
                classContent += `    @ManyToMany(mappedBy="${pluralize(node.name.toLowerCase())}")\n    private List<${otherNode.name}> ${pluralize(otherNode.name.toLowerCase())};\n\n`;
              } else {
                classContent += `    @OneToMany(mappedBy="${node.name.toLowerCase()}")\n    private ${otherNode.name} ${otherNode.name.toLowerCase()};\n\n`;
              }
            }
            break;
          case 'Composición':
            if (isSource) {
              classContent += `    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)\n    private List<${otherNode.name}> ${pluralize(otherNode.name.toLowerCase())};\n\n`;
            } else {
              classContent += `    @ManyToOne\n    private ${otherNode.name} ${otherNode.name.toLowerCase()};\n\n`;
            }
            break;
          case 'Agregación':
            if (isSource) {
              classContent += `    @ManyToOne\n    private ${otherNode.name} ${otherNode.name.toLowerCase()};\n\n`;
            } else {
              classContent += `    @OneToMany(mappedBy="${node.name.toLowerCase()}")\n    private List<${otherNode.name}> ${pluralize(otherNode.name.toLowerCase())};\n\n`;
            }
            break;
          case 'Herencia':
            if (link.from === node.key) {
              classContent = classContent.replace(`class ${node.name}`, `class ${node.name} extends ${otherNode.name}`);
            }
            break;
        }
      }
    }
  });

  node.properties.forEach(prop => {
    classContent += `    public ${prop.type} get${capitalize(prop.name)}() {\n        return ${prop.name};\n    }\n\n`;
    classContent += `    public void set${capitalize(prop.name)}(${prop.type} ${prop.name}) {\n        this.${prop.name} = ${prop.name};\n    }\n\n`;
  });

  classContent += '}\n';
  const importsString = Array.from(imports).join('\n') + '\n\n';
  return importsString + classContent;
}

function generateRepository(className) {
  return `import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ${className}Repository extends JpaRepository<${className}, Long> {
}
`;
}

function generateService(className) {
  const instanceName = className.charAt(0).toLowerCase() + className.slice(1);
  return `import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ${className}Service {

    @Autowired
    private ${className}Repository ${instanceName}Repository;

    public List<${className}> findAll() {
        return ${instanceName}Repository.findAll();
    }

    public Optional<${className}> findById(Long id) {
        return ${instanceName}Repository.findById(id);
    }

    public ${className} save(${className} ${instanceName}) {
        return ${instanceName}Repository.save(${instanceName});
    }

    public void deleteById(Long id) {
        ${instanceName}Repository.deleteById(id);
    }
}
`;
}

function generateController(className) {
  const instanceName = className.charAt(0).toLowerCase() + className.slice(1);
  return `import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/${pluralize(instanceName)}")
public class ${className}Controller {

    @Autowired
    private ${className}Service ${instanceName}Service;

    @GetMapping
    public List<${className}> getAllItems() {
        return ${instanceName}Service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<${className}> getItemById(@PathVariable Long id) {
        return ${instanceName}Service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ${className} createItem(@RequestBody ${className} ${instanceName}) {
        return ${instanceName}Service.save(${instanceName});
    }

    @PutMapping("/{id}")
    public ResponseEntity<${className}> updateItem(@PathVariable Long id, @RequestBody ${className} ${instanceName}) {
        return ${instanceName}Service.findById(id)
                .map(existingItem -> {
                    // Update existingItem with ${instanceName} fields
                    return ResponseEntity.ok(${instanceName}Service.save(existingItem));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteItem(@PathVariable Long id) {
        return ${instanceName}Service.findById(id)
                .map(item -> {
                    ${instanceName}Service.deleteById(id);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
`;
}

app.post('/generate-orm', authenticateToken, async (req, res) => {
  const tempDir = path.join(__dirname, 'temp', uuidv4());
  const zipFilePath = path.join(tempDir, 'spring-boot-orm.zip');
  
  try {
    const { diagramData } = req.body;
    const diagram = JSON.parse(diagramData);
    await fse.ensureDir(tempDir);
    const archive = archiver('zip', {
      zlib: { level: 9 } 
    });
    const output = fse.createWriteStream(zipFilePath);

    archive.on('error', (err) => {
      throw err;
    });
    archive.pipe(output);

    const layers = ['model', 'repository', 'service', 'controller'];
    layers.forEach(layer => {
      archive.append(null, { name: `src/main/java/com/example/${layer}/` });
    });

    for (const node of diagram.nodeDataArray) {
      const className = node.name;
    
      const javaContent = generateJavaClass(node, diagram);
      archive.append(javaContent, { name: `src/main/java/com/example/model/${className}.java` });
      
      const repositoryContent = generateRepository(className);
      archive.append(repositoryContent, { name: `src/main/java/com/example/repository/${className}Repository.java` });
    
      const serviceContent = generateService(className);
      archive.append(serviceContent, { name: `src/main/java/com/example/service/${className}Service.java` });
      
      const controllerContent = generateController(className);
      archive.append(controllerContent, { name: `src/main/java/com/example/controller/${className}Controller.java` });
    }
    const applicationProperties = `
spring.datasource.url=jdbc:postgresql://localhost:5432/yourdbname
spring.datasource.username=yourdbusername
spring.datasource.password=yourdbpassword
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.properties.hibernate.format_sql=true
`;
    archive.append(applicationProperties, { name: 'src/main/resources/application.properties' });
    const pomXml = `
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.5.5</version>
        <relativePath/>
    </parent>
    <groupId>com.example</groupId>
    <artifactId>spring-boot-orm</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>spring-boot-orm</name>
    <description>Spring Boot ORM project</description>
    <properties>
        <java.version>11</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
`;
    archive.append(pomXml, { name: 'pom.xml' });

    await archive.finalize();
    await new Promise((resolve) => {
      output.on('close', resolve);
    });

    res.download(zipFilePath, 'spring-boot-orm.zip', async (err) => {
      if (err) {
        console.error('Error al enviar el archivo:', err);
        res.status(500).send('Error al generar el ORM');
      }
    
      setTimeout(async () => {
        try {
          await cleanupTempDir(tempDir);
        } catch (cleanupError) {
          console.error('Error durante la limpieza:', cleanupError);
        }
      }, 1000);
    });

  } catch (error) {
    console.error('Error al generar ORM:', error);
    res.status(500).json({ error: 'Error al generar ORM', details: error.message });
    try {
      await cleanupTempDir(tempDir);
    } catch (cleanupError) {
      console.error('Error durante la limpieza después de un error:', cleanupError);
    }
  }
});

async function cleanupTempDir(dir) {
  try {
    await fse.remove(dir);
    console.log(`Directorio temporal eliminado: ${dir}`);
  } catch (error) {
    console.error(`Error al eliminar el directorio temporal ${dir}:`, error);
    throw error;
  }
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`Client joined room ${roomId}`);
  });

  socket.on('diagramUpdate', (data) => {
    socket.to(data.roomId).emit('diagramUpdate', data.diagram);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(port, () => {
  console.log(`Servidor corriendo en ${port}`);
});