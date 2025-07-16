
##  Cómo levantar la aplicación

Para poner en marcha la aplicación, sigue estos pasos:

### 1. Construir la aplicación Angular en modo producción

```bash
nmp install
ng build --configuration production
````

Este comando genera la carpeta `dist/`, que contiene los archivos listos para el despliegue.

### 2. Construir y levantar los contenedores con Docker Compose

```bash
docker-compose up --build
```

Este comando se encarga de construir las imágenes necesarias y levantar todos los servicios definidos en el archivo `docker-compose.yml`.

---

 **Acceso a la aplicación:**

Una vez levantado el entorno, accede desde tu navegador a:

```
http://localhost:8080
```

