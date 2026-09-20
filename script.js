// Repositorio de GitHub donde están los cursos, asignaturas, apuntes y ejercicios
const GITHUB_USER = "j4v13r98";
const CONTENT_REPO = "EiiStudy-Storage";
const BRANCH = "main";

const API_BASE = `https://api.github.com/repos/${GITHUB_USER}/${CONTENT_REPO}/contents`;

const content = document.getElementById("content");
const pageTitle = document.getElementById("page-title");
const breadcrumb = document.getElementById("breadcrumb");

// Devuelve un icono según el tipo de archivo
function iconFor(name) {
  if (name.endsWith(".pdf")) return "📄";
  if (name.endsWith(".zip")) return "📁";
  return "📂";
}

async function fetchContents(path = "") {
  const url = path ? `${API_BASE}/${path}?ref=${BRANCH}` : `${API_BASE}?ref=${BRANCH}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo cargar "${path || "raíz"}" (HTTP ${res.status})`);
  }
  return res.json();
}

function buildFileList(items) {
  const files = items.filter((i) => i.type === "file" && i.name !== ".gitkeep");
  if (files.length === 0) return null;

  const ul = document.createElement("ul");
  ul.className = "file-list";

  files.forEach((file) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "file-link";
    a.href = file.download_url;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = `<span class="file-icon">${iconFor(file.name)}</span> ${file.name}`;
    li.appendChild(a);
    ul.appendChild(li);
  });

  return ul;
}

function emptyMsg(text = "Vacío por ahora.") {
  const p = document.createElement("p");
  p.className = "empty";
  p.textContent = text;
  return p;
}

// Construye un breadcrumb a partir de un array de partes de ruta
function renderBreadcrumb(parts) {
  breadcrumb.innerHTML = "";

  const homeLink = document.createElement("a");
  homeLink.href = "#/";
  homeLink.textContent = "Inicio";
  breadcrumb.appendChild(homeLink);

  let accPath = "";
  parts.forEach((part) => {
    accPath += (accPath ? "/" : "") + part;
    const sep = document.createElement("span");
    sep.className = "breadcrumb-sep";
    sep.textContent = "›";
    breadcrumb.appendChild(sep);

    const link = document.createElement("a");
    link.href = `#/${accPath}`;
    link.textContent = part;
    breadcrumb.appendChild(link);
  });

  // El último tramo no es clicable
  const links = breadcrumb.querySelectorAll("a");
  if (parts.length > 0) {
    const last = links[links.length - 1];
    last.replaceWith(document.createTextNode(last.textContent));
  }

  breadcrumb.style.display = parts.length > 0 ? "block" : "none";
}

// ==========================================================
// VISTA GENÉRICA: pinta una rejilla de subcarpetas (cursos o asignaturas)
// path: ruta actual en el repo (ej. "" o "1er-curso")
// linkBase: prefijo para los href de las tarjetas (ej. "" o "1er-curso")
// ==========================================================
async function renderFolderGrid(path, linkBase) {
  content.innerHTML = `<p class="loading">Cargando...</p>`;

  try {
    const items = await fetchContents(path);
    const dirs = items.filter((i) => i.type === "dir");
    const rootFiles = items.filter((i) => i.type === "file" && i.name !== ".gitkeep");

    content.innerHTML = "";

    if (dirs.length === 0 && rootFiles.length === 0) {
      content.appendChild(emptyMsg("Todavía no hay nada en" + (path ? ` "${path}"` : " la raíz")));
      return;
    }

    if (dirs.length > 0) {
      const grid = document.createElement("div");
      grid.className = "subjects-grid";
      dirs.forEach((dir) => {
        const a = document.createElement("a");
        a.className = "subject-card";
        const href = linkBase ? `${linkBase}/${dir.name}` : dir.name;
        a.href = `#/${href}`;
        a.textContent = dir.name;
        grid.appendChild(a);
      });
      content.appendChild(grid);
    }

    // Archivos sueltos en este nivel (ej. .zip de katas en la raíz)
    if (rootFiles.length > 0) {
      const section = document.createElement("div");
      section.className = "section";
      section.innerHTML = `<h2>Otros archivos</h2>`;
      const list = buildFileList(rootFiles);
      if (list) section.appendChild(list);
      content.appendChild(section);
    }
  } catch (err) {
    content.innerHTML = `<p class="error">${err.message}</p>`;
  }
}


// VISTA: página de una asignatura — subcarpetas tipo apuntes/ejercicios
async function renderSubject(pathParts) {
  const fullPath = pathParts.join("/");
  content.innerHTML = `<p class="loading">Cargando contenido...</p>`;

  try {
    const items = await fetchContents(fullPath);
    content.innerHTML = "";

    const subfolders = items.filter((i) => i.type === "dir");
    const looseFiles = items.filter((i) => i.type === "file" && i.name !== ".gitkeep");

    if (subfolders.length === 0 && looseFiles.length === 0) {
      content.appendChild(emptyMsg("Esta asignatura todavía no tiene contenido."));
      return;
    }

    for (const folder of subfolders) {
      const section = document.createElement("div");
      section.className = "section";
      const label = folder.name.charAt(0).toUpperCase() + folder.name.slice(1);
      section.innerHTML = `<h2>${label}</h2>`;

      const subItems = await fetchContents(`${fullPath}/${folder.name}`);
      const list = buildFileList(subItems);
      section.appendChild(list || emptyMsg());
      content.appendChild(section);
    }

    if (looseFiles.length > 0) {
      const section = document.createElement("div");
      section.className = "section";
      section.innerHTML = `<h2>Archivos</h2>`;
      section.appendChild(buildFileList(looseFiles) || emptyMsg());
      content.appendChild(section);
    }
  } catch (err) {
    content.innerHTML = `<p class="error">${err.message}</p>`;
  }
}


// ROUTER: soporta varios niveles: #/curso/asignatura
function route() {
  const raw = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
  const parts = raw.split("/").filter(Boolean);

  renderBreadcrumb(parts);

  if (parts.length === 0) {
    // Nivel 0: lista de cursos
    pageTitle.textContent = "EIIStudy";
    renderFolderGrid("", "");
  } else if (parts.length === 1) {
    // Nivel 1: lista de asignaturas dentro de un curso
    pageTitle.textContent = `🎓 ${parts[0]}`;
    renderFolderGrid(parts[0], parts[0]);
  } else {
    // Nivel 2+: dentro de una asignatura → apuntes/ejercicios
    pageTitle.textContent = `📖 ${parts[parts.length - 1]}`;
    renderSubject(parts);
  }
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);


// TEMA CLARO/OSCURO
const themeToggleButton = document.getElementById("theme-toggle");

if (themeToggleButton) {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    document.body.classList.add(savedTheme);
    themeToggleButton.textContent = savedTheme === "dark-theme" ? "☀️" : "🌙";
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      document.body.classList.add("dark-theme");
      themeToggleButton.textContent = "☀️";
    } else {
      document.body.classList.add("light-theme");
      themeToggleButton.textContent = "🌙";
    }
  }

  themeToggleButton.addEventListener("click", () => {
    if (document.body.classList.contains("dark-theme")) {
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
      localStorage.setItem("theme", "light-theme");
      themeToggleButton.textContent = "🌙";
    } else {
      document.body.classList.remove("light-theme");
      document.body.classList.add("dark-theme");
      localStorage.setItem("theme", "dark-theme");
      themeToggleButton.textContent = "☀️";
    }
  });
}