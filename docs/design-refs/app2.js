(function () {
  "use strict";

  const data = window.HUB_DATA;
  const { normalizeText } = window.HUB_UTILS;
  const main = document.querySelector("#main-content");
  const nav = document.querySelector("#primary-nav");
  const breadcrumb = document.querySelector("#breadcrumb-current");
  const sidebar = document.querySelector("#sidebar");
  const menuButton = document.querySelector("#menu-button");
  const backdrop = document.querySelector("#nav-backdrop");
  const presentationNote = document.querySelector("#presentation-note");
  const toast = document.querySelector("#toast");
  const scrollProgress = document.querySelector("#scroll-progress");
  let mode = readMode();
  let toastTimer;

  const icons = {
    inicio: '<path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    educacao: '<path d="m2 10 10-5 10 5-10 5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5M22 10v6"/>',
    negocio: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>',
    produto: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    marca: '<path d="M12 22a10 10 0 1 1 10-10c0 2-1 3-3 3h-1.5a1.5 1.5 0 0 0 0 3H18"/><circle cx="7.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="10.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="14.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="17" cy="11" r=".5" fill="currentColor"/>',
    biblioteca: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z"/><path d="M4 5.5v14A1.5 1.5 0 0 0 5.5 21H20v-4"/>',
    decisoes: '<path d="M9 11 11 13 15 9M9 17l2 2 4-4"/><path d="M16 4h2a2 2 0 0 1 2 2v15H4V6a2 2 0 0 1 2-2h2M9 3h6v3H9Z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    external: '<path d="M15 3h6v6M10 14 21 3"/><path d="M18 13v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'
  };

  const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
  const esc = (value) => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
  const badge = (text, variant = "") => `<span class="badge${variant ? ` badge--${variant}` : ""}">${esc(text)}</span>`;
  const sourceStamp = (source = "Acervo Logos Academy") => `<aside class="source-stamp"><span>Fonte</span><strong>${esc(source)}</strong><span>Revisado ${esc(data.reviewedAt)}</span></aside>`;
  const pageHeading = (eyebrow, title, description, source) => `<header class="page-heading"><div><span class="eyebrow">${esc(eyebrow)}</span><h1>${title}</h1><p>${esc(description)}</p></div>${sourceStamp(source)}</header>`;
  const sectionHeader = (eyebrow, title, description = "") => `<header class="section-header"><div><span class="eyebrow">${esc(eyebrow)}</span><h2>${title}</h2></div>${description ? `<p>${esc(description)}</p>` : ""}</header>`;

  function readMode() {
    try { return sessionStorage.getItem("academy-view") || "internal"; }
    catch (_) { return "internal"; }
  }

  function writeMode(value) {
    mode = value;
    try { sessionStorage.setItem("academy-view", value); } catch (_) { /* file:// privacy mode */ }
  }

  function currentRoute() {
    const route = location.hash.replace(/^#\/?/, "").split("?")[0] || "inicio";
    const allowed = data.routes.some((item) => item.id === route && (mode === "internal" || item.visibility !== "internal"));
    return allowed ? route : "inicio";
  }

  function renderNav(activeRoute) {
    nav.innerHTML = data.routes
      .filter((item) => mode === "internal" || item.visibility !== "internal")
      .map((item, index) => `<a class="nav-link" href="#/${item.id}" ${item.id === activeRoute ? 'aria-current="page"' : ""}>${svg(item.id)}<span>${esc(item.label)}</span><small>${String(index + 1).padStart(2, "0")}</small></a>`)
      .join("");
  }

  function renderProgramCards(showPrice = false, cinematic = false) {
    return `<div class="program-grid">${data.programs.map((program, index) => `<a class="program-card card-action${cinematic ? " spot-card tilt reveal reveal--scale" : ""}" href="#/educacao?level=${program.id}" data-color="${program.color}" data-step="0${index + 1}" aria-label="Abrir currículo ${esc(program.name)}"${cinematic ? ` data-tilt style="--reveal-delay: ${index * 120}ms"` : ""}><span class="level-kicker">${esc(program.kicker)} · ${esc(program.duration)}</span><h3>${esc(program.name)}</h3><p class="promise">${esc(program.promise)}</p><p class="description">${esc(program.description)}</p><div class="card-meta">${showPrice ? `${badge(program.price, "orange")}${badge(program.status)}` : badge(program.duration)}</div><span class="card-cta">Ver currículo ${svg("arrow")}</span></a>`).join("")}</div>`;
  }

  function inlineMarkdown(value) {
    return esc(value)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
  }

  function renderRichText(markdown) {
    const output = [];
    let list = "";
    const closeList = () => { if (list) output.push(`</${list}>`); list = ""; };
    String(markdown || "").split("\n").forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line || line === "---") { closeList(); return; }
      const heading = line.match(/^#{2,4}\s+(.+)/);
      if (heading) { closeList(); output.push(`<h4>${inlineMarkdown(heading[1])}</h4>`); return; }
      const bullet = line.match(/^[-*]\s+(.+)/);
      const numbered = line.match(/^\d+\.\s+(.+)/);
      if (bullet || numbered) {
        const nextList = bullet ? "ul" : "ol";
        if (list !== nextList) { closeList(); list = nextList; output.push(`<${list}>`); }
        output.push(`<li>${inlineMarkdown((bullet || numbered)[1])}</li>`);
        return;
      }
      closeList();
      output.push(`<p>${inlineMarkdown(line)}</p>`);
    });
    closeList();
    return output.join("");
  }

  function sectionByLabel(lesson, expression) {
    return lesson.sections.find((section) => expression.test(section.label));
  }

  function renderCurriculumLesson(lesson, module, unit) {
    const quick = [
      sectionByLabel(lesson, /Objetivo/i),
      sectionByLabel(lesson, /Atividade pr\u00e1tica|Foco da aula|Foco do evento/i),
      sectionByLabel(lesson, /Entrega do aluno/i)
    ].filter(Boolean);
    const quickSet = new Set(quick);
    const deep = lesson.sections.filter((section) => !quickSet.has(section));
    const searchable = esc(`${module.name} ${unit.label} ${unit.title} ${lesson.number} ${lesson.title} ${lesson.sections.map((section) => `${section.label} ${section.body}`).join(" ")}`);
    return `<details class="lesson-accordion" id="lesson-${module.id}-${lesson.number}" data-search="${searchable}"><summary><span class="lesson-number">${String(lesson.number).padStart(2, "0")}</span><span class="lesson-title"><small>${esc(unit.label)} \u00b7 ${esc(module.name)}</small><strong>${esc(lesson.title)}</strong></span><span class="lesson-toggle" aria-hidden="true"></span></summary><div class="lesson-content"><div class="lesson-content-inner"><div class="lesson-quick">${quick.map((section) => `<section><span>${esc(section.label.replace(/ da aula| do Project Day| do Demo Day/i, ""))}</span>${renderRichText(section.body)}</section>`).join("")}</div><details class="lesson-deep"><summary>Ver plano operacional completo <span>${deep.length} t\u00f3picos</span></summary><div class="lesson-deep-grid">${deep.map((section) => `<section><h4>${esc(section.label)}</h4>${renderRichText(section.body)}</section>`).join("")}</div></details></div></div></details>`;
  }

  function renderCurriculumCycle(unit, module) {
    const objective = unit.overview.find((section) => /Objetivo|Foco/i.test(section.label));
    const result = unit.overview.find((section) => /Resultado/i.test(section.label));
    return `<section class="curriculum-cycle" id="${esc(unit.id)}"><header class="cycle-header"><div><span>${esc(unit.label)}</span><h3>${esc(unit.title)}</h3>${objective ? `<div class="cycle-summary">${renderRichText(objective.body)}</div>` : ""}</div><div class="cycle-meta">${badge(`${unit.lessons.length} aulas`)}${result ? badge("resultado definido", "orange") : ""}</div></header>${result ? `<aside class="cycle-outcome"><strong>Resultado esperado</strong>${renderRichText(result.body)}</aside>` : ""}<div class="lesson-accordions">${unit.lessons.map((lesson) => renderCurriculumLesson(lesson, module, unit)).join("")}</div></section>`;
  }

  function renderReferenceGroup(title, description, sections) {
    if (!sections.length) return "";
    return `<details class="module-reference"><summary><span><strong>${esc(title)}</strong><small>${esc(description)}</small></span><b>${sections.length} se\u00e7\u00f5es</b></summary><div class="reference-sections">${sections.map((section) => `<section><h3>${esc(section.title)}</h3>${renderRichText(section.body)}</section>`).join("")}</div></details>`;
  }

  function renderCurriculumModule(module, selectedLevel) {
    return `<section class="curriculum-module" id="curriculum-${module.id}" data-color="${module.color}"${module.id !== selectedLevel ? " hidden" : ""}><header class="curriculum-header"><div><span class="eyebrow">${esc(module.name)} \u00b7 ${esc(module.duration)}</span><h2>${module.total} aulas para ${esc(module.promise.toLocaleLowerCase("pt-BR"))}</h2><p>${esc(module.progression)}</p><div class="curriculum-stats">${badge(`${module.units.length} ${module.id === "engineer" ? "atos" : "ciclos"}`)}${badge(`${module.fieldCount} campos operacionais`)}${badge("fonte can\u00f4nica", "orange")}</div></div><div class="curriculum-actions"><a class="button button--quiet" href="${encodeURI(module.source)}" target="_blank" rel="noopener">Abrir documento ${svg("external")}</a><button class="button button--quiet" type="button" data-toggle-module="curriculum-${module.id}">Expandir aulas</button></div></header><nav class="cycle-index" aria-label="${esc(module.name)}: ciclos ou atos">${module.units.map((unit) => `<a href="#${esc(unit.id)}"><span>${esc(unit.label)}</span><strong>${esc(unit.title)}</strong><small>${unit.lessons.length} aulas</small></a>`).join("")}</nav><div class="module-references">${renderReferenceGroup("Fundamentos do n\u00edvel", "Objetivos, princ\u00edpios, compet\u00eancias e estrutura das aulas.", module.foundations)}${renderReferenceGroup("Avalia\u00e7\u00e3o e opera\u00e7\u00e3o", "Rubricas, reviews, relat\u00f3rios e orienta\u00e7\u00f5es de condu\u00e7\u00e3o.", module.supplements)}</div><div class="curriculum-cycles">${module.units.map((unit) => renderCurriculumCycle(unit, module)).join("")}</div><div class="curriculum-no-results" hidden><strong>Nenhuma aula encontrada neste n\u00edvel.</strong><p>Tente outro termo ou remova a busca.</p></div></section>`;
  }

  /* ============ Motor de motion — vanilla ============ */

  function respectsReducedMotion() {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function initReveals(scope) {
    const items = scope.querySelectorAll(".reveal");
    if (!items.length) return;
    if (respectsReducedMotion() || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -6% 0px" });
    items.forEach((item) => observer.observe(item));
  }

  function initCounters(scope) {
    const counters = scope.querySelectorAll("[data-count-to]");
    if (!counters.length) return;
    const format = (value) => value.toLocaleString("pt-BR");
    if (respectsReducedMotion() || !("IntersectionObserver" in window)) {
      counters.forEach((counter) => { counter.textContent = format(Number(counter.dataset.countTo)); });
      return;
    }
    const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
    const run = (counter) => {
      const target = Number(counter.dataset.countTo);
      const start = performance.now();
      const duration = 1600;
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        counter.textContent = format(Math.round(easeOutExpo(progress) * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    counters.forEach((counter) => observer.observe(counter));
  }

  function initTilt(scope) {
    if (respectsReducedMotion() || matchMedia("(hover: none)").matches) return;
    scope.querySelectorAll("[data-tilt]").forEach((card) => {
      let frame = 0;
      card.addEventListener("mousemove", (event) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const relX = (event.clientX - rect.left) / rect.width - 0.5;
          const relY = (event.clientY - rect.top) / rect.height - 0.5;
          card.style.transform = `perspective(900px) rotateX(${(-relY * 6).toFixed(2)}deg) rotateY(${(relX * 6).toFixed(2)}deg) translateY(-6px)`;
        });
      });
      card.addEventListener("mouseleave", () => {
        cancelAnimationFrame(frame);
        card.style.transform = "";
      });
    });
  }

  function initSpotlight(scope) {
    if (matchMedia("(hover: none)").matches) return;
    scope.querySelectorAll(".spot-card").forEach((card) => {
      card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        card.style.setProperty("--my", `${event.clientY - rect.top}px`);
      });
    });
  }

  function initParallax(scope) {
    if (respectsReducedMotion()) return;
    const target = scope.querySelector("[data-parallax]");
    if (!target) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const offset = Math.min(window.scrollY, window.innerHeight) * 0.12;
      target.style.transform = `translateY(${offset.toFixed(1)}px)`;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
  }

  function initSplitAccordion(scope) {
    // Réplica vanilla do efeito de registry.watermelon.sh/r/card-split-accordian: um item aberto por vez,
    // altura via grid-template-rows (funciona em <details> nativo, ver styles2.css), vizinhos imediatos
    // perdem o canto voltado pro item aberto — a "quebra" visual do componente original em React/Framer.
    scope.querySelectorAll(".lesson-accordions").forEach((group) => {
      if (group.dataset.splitBound) return;
      group.dataset.splitBound = "1";
      group.addEventListener("click", (event) => {
        const summary = event.target.closest("summary");
        if (!summary) return;
        const item = summary.parentElement;
        if (!item.classList.contains("lesson-accordion") || item.parentElement !== group) return; // ignora o <details> aninhado (.lesson-deep)
        event.preventDefault();
        const items = [...group.querySelectorAll(":scope > .lesson-accordion")];
        const wasOpen = item.classList.contains("is-open");
        items.forEach((lesson) => {
          lesson.classList.remove("is-open", "is-adjacent-above", "is-adjacent-below");
          lesson.open = false;
        });
        if (wasOpen) return;
        item.open = true;
        const idx = items.indexOf(item);
        if (items[idx - 1]) items[idx - 1].classList.add("is-adjacent-above");
        if (items[idx + 1]) items[idx + 1].classList.add("is-adjacent-below");
        requestAnimationFrame(() => item.classList.add("is-open"));
      });
    });
  }

  function initTimeline(scope) {
    const line = scope.querySelector(".build-timeline");
    if (!line) return;
    if (respectsReducedMotion() || !("IntersectionObserver" in window)) {
      line.style.setProperty("--line-progress", 1);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        line.style.setProperty("--line-progress", 1);
        observer.disconnect();
      });
    }, { threshold: 0.3 });
    observer.observe(line);
  }

  function initScrollProgress(route) {
    const bar = scrollProgress.querySelector("i");
    const spineFill = main.querySelector(".journey-spine__track i");
    const nodes = [...main.querySelectorAll(".journey-node")];
    if (route !== "inicio" || respectsReducedMotion()) {
      scrollProgress.hidden = true;
      if (spineFill) spineFill.style.transform = "scaleY(1)";
      nodes.forEach((node) => node.classList.add("is-active"));
      return;
    }
    scrollProgress.hidden = false;
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      bar.style.transform = `scaleX(${ratio.toFixed(4)})`;
      if (spineFill) spineFill.style.transform = `scaleY(${ratio.toFixed(4)})`;
      nodes.forEach((node) => node.classList.toggle("is-active", ratio >= parseFloat(node.dataset.at)));
    };
    update();
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  }

  function initSwatches(scope) {
    scope.querySelectorAll("[data-hex]").forEach((swatch) => {
      swatch.setAttribute("role", "button");
      swatch.setAttribute("tabindex", "0");
      swatch.setAttribute("aria-label", `Copiar cor ${swatch.dataset.hex}`);
      const copyColor = () => {
        const hex = swatch.dataset.hex;
        const done = () => showToast(`${hex} copiado para a \u00e1rea de transfer\u00eancia.`);
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(hex).then(done).catch(() => showToast(hex));
        else showToast(hex);
      };
      swatch.addEventListener("click", copyColor);
      swatch.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); copyColor(); }
      });
    });
  }

  /* ============ Home cinematogr\u00e1fica ============ */

  // Kinetic Constellation: rede de pontos em canvas 2D, reativa ao cursor.
  // Retorna teardown (ou null). Fallback: reduced-motion/sem canvas → nada renderiza, hero glow permanece.
  function initConstellation(scope) {
    const canvas = scope.querySelector(".cine-constellation");
    if (!canvas || !canvas.getContext || respectsReducedMotion()) return null;
    const hero = canvas.closest(".cine-hero");
    const ctx = canvas.getContext("2d");
    const palette = ["255,107,0", "124,92,252", "37,99,235"]; // orange, explorer, engineer
    const LINK = 132;
    const pointer = { x: -9999, y: -9999, active: false };
    let w = 0, h = 0, particles = [], raf = 0, running = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = hero.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(w, 1400) / 16); // densidade ~ largura
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.26, vy: (Math.random() - 0.5) * 0.26,
        c: palette[(Math.random() * palette.length) | 0],
        r: Math.random() * 1.5 + 0.6
      }));
    };

    // ponytail: varredura de pares O(n²); n~85 → ~3.6k/frame, folgado. Grade espacial só se n crescer muito.
    const frame = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        if (pointer.active) {
          const dx = pointer.x - p.x, dy = pointer.y - p.y;
          if (dx * dx + dy * dy < 26896) { p.x += dx * 0.0016; p.y += dy * 0.0016; } // raio 164px
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.c},0.85)`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${a.c},${((1 - d / LINK) * 0.26).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        if (pointer.active) {
          const d = Math.hypot(a.x - pointer.x, a.y - pointer.y);
          if (d < LINK * 1.5) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y);
            ctx.strokeStyle = `rgba(255,107,0,${((1 - d / (LINK * 1.5)) * 0.42).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    const onMove = (event) => {
      const rect = hero.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };
    const onLeave = () => { pointer.active = false; };
    const onResize = () => resize();
    const onVisibility = () => { document.hidden ? stop() : start(); };

    resize();
    canvas.classList.add("is-live");
    hero.addEventListener("mousemove", onMove, { passive: true });
    hero.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    // pausa a rede quando o hero sai da viewport (economia de CPU)
    let io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
      }, { threshold: 0 });
      io.observe(hero);
    } else {
      start();
    }

    return () => {
      stop();
      hero.removeEventListener("mousemove", onMove);
      hero.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (io) io.disconnect();
    };
  }

  function renderHome() {
    const totalLessons = data.curriculum.reduce((sum, module) => sum + module.total, 0);
    const totalUnits = data.curriculum.reduce((sum, module) => sum + module.units.length, 0);
    const chips = [...data.competencies, ...data.competencies].map((item) => `<span class="marquee-chip">${esc(item)}</span>`).join("");
    return `<div class="page cine-page">
      <aside class="journey-spine" aria-hidden="true">
        <span class="journey-spine__track"><i></i></span>
        <span class="journey-node" data-at="0.02"><b>Explorer</b></span>
        <span class="journey-node" data-at="0.40"><b>Builder</b></span>
        <span class="journey-node" data-at="0.76"><b>Engineer</b></span>
      </aside>
      <section class="cine-hero">
        <canvas class="cine-constellation" aria-hidden="true"></canvas>
        <div class="cine-hero-grid">
          <div class="cine-hero-copy">
            <span class="eyebrow eyebrow--inverse reveal">Logos Academy \u00b7 Hub 2026</span>
            <h1 class="cine-title"><span class="line"><span style="--reveal-delay: 120ms">Capacidade,</span></span><span class="line"><span style="--reveal-delay: 300ms"><em>n\u00e3o aula.</em></span></span></h1>
            <p class="reveal" style="--reveal-delay: 460ms">Uma vis\u00e3o \u00fanica da forma\u00e7\u00e3o, da opera\u00e7\u00e3o e do produto. Da primeira descoberta \u00e0 capacidade de projetar sistemas.</p>
            <div class="cine-actions reveal" style="--reveal-delay: 600ms"><a class="button button--primary" href="#/educacao">Explorar a forma\u00e7\u00e3o ${svg("arrow")}</a><a class="button button--ghost" href="#/biblioteca">Abrir biblioteca</a></div>
          </div>
          <div class="cine-symbol" data-parallax>
            <span class="halo" aria-hidden="true"></span>
            <span class="ring" aria-hidden="true"></span>
            <span class="ring ring--2" aria-hidden="true"></span>
            <img src="assets/logos-academy-symbol-dark.png" alt="S\u00edmbolo da Logos Academy">
            <span class="orbit-tag orbit-tag--a">Explorer \u00b7 Descobrir</span>
            <span class="orbit-tag orbit-tag--b">Builder \u00b7 Construir</span>
            <span class="orbit-tag orbit-tag--c">Engineer \u00b7 Projetar</span>
          </div>
        </div>
        <a class="scroll-cue" href="#ato-construcao" aria-label="Rolar para o mapa de constru\u00e7\u00e3o"><span>Role para explorar</span><i aria-hidden="true"></i></a>
      </section>

      <section class="cine-act" id="ato-construcao">
        <div class="cine-act__inner">
          ${sectionHeader("Mapa de constru\u00e7\u00e3o", "Uma vis\u00e3o \u00fanica, quatro movimentos", "Da primeira descoberta \u00e0 capacidade de projetar sistemas.")}
          <div class="build-timeline">
            <div class="build-step reveal reveal--left"><b>01</b><span><strong>Forma\u00e7\u00e3o</strong><small>Conceitos e projetos</small></span></div>
            <div class="build-step reveal reveal--left" style="--reveal-delay: 140ms"><b>02</b><span><strong>Evid\u00eancia</strong><small>Portf\u00f3lio e compet\u00eancias</small></span></div>
            <div class="build-step reveal reveal--left" style="--reveal-delay: 280ms"><b>03</b><span><strong>Opera\u00e7\u00e3o</strong><small>M\u00e9todo e acompanhamento</small></span></div>
            <div class="build-step reveal reveal--left" style="--reveal-delay: 420ms"><b>04</b><span><strong>Evolu\u00e7\u00e3o</strong><small>Pr\u00f3ximo n\u00edvel</small></span></div>
          </div>
          <div class="stat-band">
            <div class="stat-counter reveal"><b data-count-to="${totalLessons}">0</b><span>aulas detalhadas</span></div>
            <div class="stat-counter reveal" style="--reveal-delay: 140ms"><b data-count-to="${totalUnits}">0</b><span>ciclos e atos</span></div>
            <div class="stat-counter reveal" style="--reveal-delay: 280ms"><b data-count-to="11">0</b><span>campos por aula</span></div>
          </div>
        </div>
      </section>

      <section class="cine-light">
        <div class="cine-light__inner">
          ${sectionHeader("Youth", "Uma progress\u00e3o que deixa rastros", "Cada n\u00edvel termina em algo constru\u00eddo, explicado e demonstr\u00e1vel.")}
          ${renderProgramCards(false, true)}
        </div>
      </section>

      <div class="competency-marquee" aria-label="Compet\u00eancias desenvolvidas">
        <div class="marquee-track">${chips}</div>
      </div>

      <section class="cine-act">
        <div class="cine-act__inner">
          ${sectionHeader("Dois universos", "Uma tese pedag\u00f3gica, dois p\u00fablicos")}
          <div class="cine-duo">
            <a class="content-card content-card--dark card-action spot-card reveal reveal--left" href="#/educacao?level=explorer"><span class="eyebrow eyebrow--inverse">Youth</span><h3>Aprender construindo</h3><p>Para jovens de 12 a 18 anos, a tecnologia deixa de ser consumo e vira linguagem de cria\u00e7\u00e3o.</p><ul><li>Explorer \u00b7 descobrir possibilidades</li><li>Builder \u00b7 construir aplica\u00e7\u00f5es</li><li>Engineer \u00b7 projetar sistemas</li></ul><span class="card-cta">Abrir curr\u00edculo ${svg("arrow")}</span></a>
            <a class="content-card card-action spot-card reveal reveal--right" href="#/negocio"><span class="eyebrow">Adult</span><h3>Aplicar, construir, evoluir</h3><p>A mesma tese pedag\u00f3gica em tr\u00eas contextos profissionais.</p><ul>${data.adultPrograms.map((item) => `<li><strong>${esc(item.name)}:</strong> ${esc(item.outcome)}</li>`).join("")}</ul><span class="card-cta">Ver oferta ${svg("arrow")}</span></a>
          </div>
        </div>
      </section>

      <section class="cine-quote">
        <blockquote class="reveal">\u201cO produto \u00e9 a capacidade de aprender, construir e aplicar \u2014 n\u00e3o o conte\u00fado assistido.\u201d</blockquote>
        <footer class="reveal" style="--reveal-delay: 200ms">Guardrail central da marca</footer>
      </section>

      <section class="final-cta">
        <h2 class="reveal">Explore. Construa.<br>Engenhe o futuro.</h2>
        <p class="reveal" style="--reveal-delay: 160ms">Educa\u00e7\u00e3o para um futuro inteligente \u2014 navegue pelas \u00e1reas do hub para conhecer a forma\u00e7\u00e3o, a opera\u00e7\u00e3o, o produto e a marca.</p>
        <div class="cine-actions reveal" style="--reveal-delay: 320ms"><a class="button button--primary" href="#/educacao">Come\u00e7ar pela Educa\u00e7\u00e3o ${svg("arrow")}</a><a class="button button--ghost" href="#/marca">Conhecer a marca</a></div>
      </section>
    </div>`;
  }

  /* ============ Rotas internas (conte\u00fado id\u00eantico \u00e0 v1) ============ */

  function renderEducation() {
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    const requestedLevel = params.get("level");
    const selectedLevel = data.curriculum.some((module) => module.id === requestedLevel) ? requestedLevel : "explorer";
    const totalLessons = data.curriculum.reduce((sum, module) => sum + module.total, 0);
    const totalUnits = data.curriculum.reduce((sum, module) => sum + module.units.length, 0);
    return `<div class="page page--educacao">
      ${pageHeading("Educa\u00e7\u00e3o", "Tr\u00eas n\u00edveis.<br>Uma progress\u00e3o operacional.", "Uma leitura r\u00e1pida mostra a estrutura. Cada ciclo, aula e orienta\u00e7\u00e3o docente pode ser aberto quando for necess\u00e1rio preparar, acompanhar ou auditar a forma\u00e7\u00e3o.", "Curr\u00edculos Operacionais \u00b7 Explorer, Builder e Engineer")}

      <section class="education-overview"><div><span class="eyebrow eyebrow--inverse">Curr\u00edculo Youth</span><h2>Do primeiro experimento ao sistema em produ\u00e7\u00e3o.</h2><p>Explorer amplia repert\u00f3rio. Builder transforma repert\u00f3rio em aplica\u00e7\u00f5es. Engineer organiza decis\u00f5es, dados, IA, seguran\u00e7a e opera\u00e7\u00e3o em um Capstone.</p></div><dl><div><dt data-count-to="${totalLessons}">0</dt><dd>aulas detalhadas</dd></div><div><dt data-count-to="${totalUnits}">0</dt><dd>ciclos e atos</dd></div><div><dt data-count-to="11">0</dt><dd>campos por aula</dd></div></dl></section>

      <section class="section">${sectionHeader("Vis\u00e3o inicial", "Escolha o n\u00edvel para entender a proposta", "Cada card abre uma leitura progressiva: vis\u00e3o geral, ciclos ou atos, aulas e plano operacional completo.")}${renderProgramCards(false, true)}</section>

      <section class="section curriculum-reading-path" aria-label="Como ler o curr\u00edculo"><div><span>1</span><strong>Reconhe\u00e7a o n\u00edvel</strong><p>Objetivo, dura\u00e7\u00e3o e resultado esperado.</p></div><div><span>2</span><strong>Veja a progress\u00e3o</strong><p>Ciclos, atos, projetos e quantidade de aulas.</p></div><div><span>3</span><strong>Abra a aula</strong><p>Objetivo, pr\u00e1tica, entrega e orienta\u00e7\u00e3o docente.</p></div></section>

      <section class="section curriculum-browser" id="curriculum-levels">${sectionHeader("Curr\u00edculo operacional", `${totalLessons} aulas com profundidade sob demanda`, "Selecione um n\u00edvel e busque por conceito, ferramenta, atividade, evid\u00eancia ou dificuldade prevista.")}<div class="curriculum-toolbar"><div class="curriculum-tabs" role="tablist" aria-label="Selecionar n\u00edvel">${data.curriculum.map((module) => `<button type="button" role="tab" data-curriculum-level="${module.id}" aria-selected="${module.id === selectedLevel}"><span>${esc(module.name)}</span><small>${module.total} aulas</small></button>`).join("")}</div><label class="search-field">${svg("search")}<span class="sr-only">Buscar no curr\u00edculo selecionado</span><input id="lesson-search" type="search" placeholder="Buscar nas aulas de ${esc(data.curriculum.find((module) => module.id === selectedLevel).name)}\u2026" autocomplete="off"></label></div></section>

      ${data.curriculum.map((module) => renderCurriculumModule(module, selectedLevel)).join("")}
    </div>`;
  }

  function renderBusiness() {
    const internalFinance = mode === "internal" ? `<section class="section">${sectionHeader("Vis\u00e3o interna", "Economia por turma", "Valores s\u00e3o premissas de trabalho; n\u00e3o representam uma tabela comercial final.")}<div class="split-grid"><div class="content-card"><h3>Waterfall de margem</h3><ul><li>Receita bruta contratada</li><li>Descontos e inadimpl\u00eancia</li><li>Taxas e impostos</li><li>Custos diretos de atendimento</li><li>Margem de contribui\u00e7\u00e3o</li><li>Custo econ\u00f4mico do fundador</li></ul></div><div class="content-card content-card--dark"><h3>Capacidade antes de escala</h3><p>A opera\u00e7\u00e3o deve separar pre\u00e7o de tabela, receita recebida e custo real de atendimento. Crescer s\u00f3 faz sentido quando qualidade pedag\u00f3gica e margem permanecem saud\u00e1veis.</p><div class="card-meta card-meta--spaced">${badge("Interno", "orange")}${badge("Premissas abertas")}</div></div></div></section>` : "";

    return `<div class="page page--negocio">
      ${pageHeading("Neg\u00f3cio", "Oferta, opera\u00e7\u00e3o<br>e sustentabilidade.", "A forma\u00e7\u00e3o \u00e9 organizada como uma entrega de capacidade: promessa clara, evid\u00eancia concreta e opera\u00e7\u00e3o financeiramente leg\u00edvel.", "Identidade de marca + Plano financeiro")}

      <section>${sectionHeader("Oferta Youth", "Pre\u00e7os considerados", "Faixas em valida\u00e7\u00e3o. Parcelamento, descontos e pol\u00edtica comercial ainda ser\u00e3o definidos.")}${renderProgramCards(true, true)}</section>

      <section class="section split-grid"><article class="content-card"><span class="eyebrow">Aulas particulares</span><h3>Uma linha de neg\u00f3cio pr\u00f3pria</h3><p>Atendimento para nivelamento, avan\u00e7o acelerado ou aplica\u00e7\u00e3o de IA a um problema profissional espec\u00edfico.</p><ul><li>Pre\u00e7o separado das turmas</li><li>Prepara\u00e7\u00e3o e acompanhamento inclu\u00eddos no c\u00e1lculo</li><li>Poss\u00edvel porta de entrada para trilhas completas</li></ul></article><article class="content-card"><span class="eyebrow">Adult</span><h3>Tr\u00eas camadas, uma progress\u00e3o</h3><ul>${data.adultPrograms.map((item) => `<li><strong>${item.name}</strong> \u00b7 ${item.outcome}</li>`).join("")}</ul></article></section>

      ${internalFinance}

      <section class="section">${sectionHeader("Opera\u00e7\u00e3o", "O ciclo que sustenta a experi\u00eancia")}<div class="principle-list">${[
        ["01", "Atrair e qualificar", "Oferta coerente, turma certa e expectativa expl\u00edcita."],
        ["02", "Matricular com responsabilidade", "Dados m\u00ednimos, termos claros e finalidade definida."],
        ["03", "Entregar e acompanhar", "Presen\u00e7a, projetos, feedback e comunica\u00e7\u00e3o com respons\u00e1veis."],
        ["04", "Demonstrar valor", "Portf\u00f3lio, relat\u00f3rio, certificado e Demo Day."],
        ["05", "Aprender com a turma", "Reten\u00e7\u00e3o, conclus\u00e3o, qualidade e capacidade alimentam a pr\u00f3xima decis\u00e3o."]
      ].map(([n, title, text]) => `<div class="principle-row reveal"><span>${n}</span><strong>${title}</strong><p>${text}</p></div>`).join("")}</div></section>
    </div>`;
  }

  function renderProduct() {
    return `<div class="page page--produto">
      ${pageHeading("Produto", "A plataforma entrega<br>evid\u00eancia de compet\u00eancia.", "Conte\u00fado apoia a jornada. O n\u00facleo do produto \u00e9 mostrar o que foi constru\u00eddo, como evoluiu e qual capacidade foi demonstrada.", "PRD da Plataforma Logos Academy")}

      <section class="quote-panel"><div><blockquote>A plataforma n\u00e3o entrega conte\u00fado. Ela entrega evid\u00eancia de compet\u00eancia.</blockquote><footer>Tese do produto</footer></div></section>

      <section class="section" id="platform-overview">${sectionHeader("Como a plataforma funciona", "A jornada pedag\u00f3gica vira um sistema operacional", "A experi\u00eancia conecta aula, constru\u00e7\u00e3o, feedback e evid\u00eancia. Cada pessoa enxerga o mesmo progresso pela perspectiva de que precisa.")}<div class="platform-flow">
        <a class="platform-card card-action reveal spot-card" href="#/produto?sec=platform-roadmap"><span>01</span><h3>Aprender</h3><p>Aula de hoje, microconte\u00fado, materiais, atividade e checklist de conclus\u00e3o.</p><b>Conte\u00fado no contexto ${svg("arrow")}</b></a>
        <a class="platform-card card-action reveal spot-card" href="#/produto?sec=platform-roadmap"><span>02</span><h3>Construir</h3><p>Projetos, desafios e Build Log transformam estudo em pr\u00e1tica observ\u00e1vel.</p><b>Entrega progressiva ${svg("arrow")}</b></a>
        <a class="platform-card card-action reveal spot-card" href="#/produto?sec=student-passport"><span>03</span><h3>Evidenciar</h3><p>Portf\u00f3lio e Student Passport organizam compet\u00eancias, vers\u00f5es e autoria.</p><b>Progresso verific\u00e1vel ${svg("arrow")}</b></a>
        <a class="platform-card card-action reveal spot-card" href="#/produto?sec=platform-metrics"><span>04</span><h3>Acompanhar</h3><p>Mentores, respons\u00e1veis e Academy recebem sinais \u00fateis para a pr\u00f3xima a\u00e7\u00e3o.</p><b>Decis\u00e3o informada ${svg("arrow")}</b></a>
      </div></section>

      <section class="section split-grid platform-story"><article class="content-card"><span class="eyebrow">Para o aluno</span><h3>Um lugar para saber o que fazer agora</h3><p>O dashboard re\u00fane a aula atual, pr\u00f3ximos passos, projetos em andamento e o hist\u00f3rico do que j\u00e1 foi demonstrado. A plataforma reduz a dist\u00e2ncia entre assistir, praticar e publicar.</p></article><article class="content-card content-card--dark"><span class="eyebrow eyebrow--inverse">Para a Academy</span><h3>Uma opera\u00e7\u00e3o guiada por evid\u00eancias</h3><p>Presen\u00e7a, conclus\u00e3o, feedback, portf\u00f3lio e progress\u00e3o deixam de viver em arquivos isolados. O produto cria uma leitura compartilhada da jornada sem substituir a mentoria.</p></article></section>

      <section class="section" id="platform-roadmap">${sectionHeader("Roadmap", "22 funcionalidades em quatro horizontes", "A matriz impede que diferencia\u00e7\u00e3o futura atrase o n\u00facleo da experi\u00eancia.")}<div class="tier-grid">${data.productTiers.map((tier) => `<article class="tier-card reveal spot-card"><span>${tier.tier}</span><h3>${tier.label}</h3><ul>${tier.items.map((item) => `<li>${item}</li>`).join("")}</ul></article>`).join("")}</div></section>

      <section class="section split-grid" id="student-passport"><article class="content-card content-card--dark"><span class="eyebrow eyebrow--inverse">Student Passport</span><h3>A identidade que cresce com o aluno</h3><p>Compet\u00eancias, presen\u00e7a, projetos, desafios e pr\u00f3ximos passos reunidos em uma narrativa verific\u00e1vel de evolu\u00e7\u00e3o.</p><ul><li>Projetos publicados</li><li>Compet\u00eancias demonstradas</li><li>Build Log e vers\u00f5es</li><li>Pr\u00f3ximo objetivo</li></ul></article><article class="content-card"><span class="eyebrow">Quatro perspectivas</span><h3>Um produto, necessidades diferentes</h3><ul><li><strong>Aluno:</strong> construir e reconhecer progresso</li><li><strong>Respons\u00e1vel:</strong> compreender evolu\u00e7\u00e3o</li><li><strong>Mentor:</strong> acompanhar e orientar</li><li><strong>Academy:</strong> melhorar reten\u00e7\u00e3o e entrega</li></ul></article></section>

      <section class="section" id="platform-metrics">${sectionHeader("M\u00e9tricas", "Medir transforma\u00e7\u00e3o, n\u00e3o cliques")}<table class="data-table"><thead><tr><th>Perspectiva</th><th>Sinal principal</th><th>Estado</th></tr></thead><tbody>${data.productMetrics.map(([owner, metric, status]) => `<tr><td><strong>${owner}</strong></td><td>${metric}</td><td>${badge(status)}</td></tr>`).join("")}</tbody></table></section>
    </div>`;
  }

  function renderBrand() {
    const colors = [
      ["Obsidian", "#101114", "ink-950"], ["Graphite", "#17191d", "ink-900"], ["Academy Orange", "#ff6b00", "orange"],
      ["Explorer Purple", "#7c5cfc", "purple"], ["Builder Blue", "#2563eb", "blue"], ["Engineer Green", "#16a34a", "green"]
    ];
    return `<div class="page page--marca">
      ${pageHeading("Marca", "Lab + Academy<br>+ Studio.", "Tecnol\u00f3gica e contempor\u00e2nea, sem ser juvenil ou corporativa. Uma identidade de constru\u00e7\u00e3o, progress\u00e3o e autoria.", "Design System + Identidade de marca")}

      <section class="section section--first">
        <figure class="brand-board">
          <img src="assets/logos-academy-brand-board.png" alt="Prancha do sistema de identidade visual da Logos Academy">
          <figcaption>Sistema visual oficial: assinatura, aplica\u00e7\u00f5es, paleta, tipografia, \u00edcones e usos corretos.</figcaption>
        </figure>
      </section>

      <section class="quote-panel"><div><blockquote>Explore. Construa. Engenhe o futuro com tecnologia.</blockquote><footer>Territ\u00f3rio verbal da Logos Academy</footer></div></section>

      <section class="section">${sectionHeader("Princ\u00edpios", "Decis\u00f5es antes de decora\u00e7\u00e3o")}<div class="principle-list">${data.brandPrinciples.map(([title, text], index) => `<div class="principle-row reveal"><span>${String(index + 1).padStart(2, "0")}</span><strong>${title}</strong><p>${text}</p></div>`).join("")}</div></section>

      <section class="section">${sectionHeader("Cor", "Uma base s\u00f3bria, n\u00edveis reconhec\u00edveis", "Laranja \u00e9 a a\u00e7\u00e3o da marca. Roxo, azul e verde organizam progress\u00e3o \u2014 n\u00e3o decoram aleatoriamente. Toque em uma cor para copiar o c\u00f3digo.")}<div class="palette">${colors.map(([name, hex, token]) => `<div class="swatch swatch--${token}" data-hex="${hex}"><strong>${name}</strong><code>${hex}</code></div>`).join("")}</div></section>

      <section class="section split-grid"><article class="content-card"><span class="eyebrow">Tipografia</span><h3>Inter + JetBrains Mono</h3><p>Inter sustenta leitura e interface. JetBrains Mono identifica dados, metadados, c\u00f3digos e progress\u00e3o.</p><div class="card-meta card-meta--spaced">${badge("Clareza")}${badge("Precis\u00e3o")}${badge("Hierarquia")}</div></article><article class="content-card content-card--dark"><span class="eyebrow eyebrow--inverse">Voz</span><h3>Direta, espec\u00edfica, capaz</h3><p>Falar do que a pessoa controla e constr\u00f3i. Sem promessas de riqueza r\u00e1pida, dom\u00ednio instant\u00e2neo ou emprego garantido.</p></article></section>
    </div>`;
  }

  function renderLibrary() {
    const visibleMaterials = data.materials.filter((item) => mode === "internal" || item.visibility !== "internal");
    const groups = [...new Set(visibleMaterials.map((item) => item.group))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return `<div class="page page--biblioteca">
      ${pageHeading("Biblioteca", "O acervo que<br>sustenta a opera\u00e7\u00e3o.", "Materiais pedag\u00f3gicos, comerciais, operacionais e estrat\u00e9gicos com acesso direto \u00e0s fontes preservadas.", `${data.materials.length} arquivos em sources/`)}
      <section><div class="search-panel"><label class="search-field">${svg("search")}<span class="sr-only">Buscar material</span><input id="material-search" type="search" placeholder="Buscar arquivo, categoria ou finalidade\u2026" autocomplete="off"></label><label><span class="sr-only">Filtrar categoria</span><select class="filter-select" id="material-filter"><option value="">Todas as categorias</option>${groups.map((group) => `<option value="${esc(group)}">${esc(group)}</option>`).join("")}</select></label></div><div class="resource-list" id="material-results"></div></section>
    </div>`;
  }

  function renderDecisions() {
    return `<div class="page page--decisoes">
      ${pageHeading("Decis\u00f5es", "O que falta fechar<br>para a pr\u00f3xima etapa.", "Lacunas expl\u00edcitas, organizadas por responsabilidade. Nenhuma resposta \u00e9 inventada pelo hub.", "Acervo consolidado \u00b7 uso interno")}
      <section><div class="decision-grid">${data.decisions.map((item, index) => `<article class="decision-card reveal spot-card"><span class="decision-index">${String(index + 1).padStart(2, "0")}</span>${badge(item.group, "pending")}<h3>${esc(item.title)}</h3><p>${esc(item.detail)}</p></article>`).join("")}</div></section>
      <section class="section split-grid"><article class="content-card content-card--dark"><span class="eyebrow eyebrow--inverse">Regra</span><h3>Pendente n\u00e3o \u00e9 inexistente</h3><p>O hub explicita o que ainda precisa de dono, evid\u00eancia e prazo. Um n\u00famero provis\u00f3rio nunca aparece como decis\u00e3o final.</p></article><article class="content-card"><span class="eyebrow">Pr\u00f3ximo movimento</span><h3>Fechar pol\u00edticas antes de escalar</h3><p>Pre\u00e7o, capacidade, prote\u00e7\u00e3o de menores e qualidade pedag\u00f3gica formam o conjunto m\u00ednimo para abrir novas turmas com seguran\u00e7a.</p></article></section>
    </div>`;
  }

  const renderers = { inicio: renderHome, educacao: renderEducation, negocio: renderBusiness, produto: renderProduct, marca: renderBrand, biblioteca: renderLibrary, decisoes: renderDecisions };

  /* ============ Busca, filtros e eventos ============ */

  function filterCurriculum(query = "") {
    const normalized = normalizeText(query);
    document.querySelectorAll(".curriculum-module").forEach((module) => {
      let visible = 0;
      module.querySelectorAll(".curriculum-cycle").forEach((cycle) => {
        let cycleVisible = 0;
        cycle.querySelectorAll(".lesson-accordion").forEach((lesson) => {
          lesson.hidden = Boolean(normalized) && !normalizeText(lesson.dataset.search).includes(normalized);
          if (!lesson.hidden) { visible += 1; cycleVisible += 1; }
        });
        cycle.hidden = cycleVisible === 0;
      });
      module.querySelector(".curriculum-no-results").hidden = visible !== 0;
      module.querySelector("[data-toggle-module]").textContent = "Expandir aulas";
    });
  }

  function selectCurriculumLevel(level, shouldScroll = false) {
    const selected = data.curriculum.find((module) => module.id === level) || data.curriculum[0];
    document.querySelectorAll(".curriculum-module").forEach((module) => { module.hidden = module.id !== `curriculum-${selected.id}`; });
    document.querySelectorAll("[data-curriculum-level]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.curriculumLevel === selected.id)));
    const input = document.querySelector("#lesson-search");
    input.placeholder = `Buscar nas ${selected.total} aulas de ${selected.name}\u2026`;
    history.replaceState(null, "", `#/educacao?level=${selected.id}`);
    filterCurriculum(input.value);
    if (shouldScroll) document.querySelector(`#curriculum-${selected.id}`).scrollIntoView({ block: "start", behavior: respectsReducedMotion() ? "auto" : "smooth" });
  }

  function emptyState(title, text) {
    return `<div class="empty-state"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`;
  }

  function renderMaterialResults(query = "", group = "") {
    const target = document.querySelector("#material-results");
    if (!target) return;
    const normalized = normalizeText(query);
    const results = data.materials.filter((item) => (mode === "internal" || item.visibility !== "internal") && (!group || item.group === group) && normalizeText(`${item.title} ${item.group} ${item.summary}`).includes(normalized));
    target.innerHTML = results.length ? results.map((item) => `<article class="resource-card spot-card"><div>${badge(item.group)}${item.visibility === "internal" ? badge("Interno", "dark") : ""}<h3>${esc(item.title)}</h3><p>${esc(item.summary)} \u00b7 <span>${esc(item.source.replace("sources/", ""))}</span></p></div><a href="${encodeURI(item.source)}" target="_blank" rel="noopener" aria-label="Abrir ${esc(item.title)}">${svg("external")}</a></article>`).join("") : emptyState("Nenhum material encontrado", "Remova um filtro ou tente uma busca mais ampla.");
    initSpotlight(target); // spotlight sobrevive aos re-renders de busca/filtro
  }

  function attachPageEvents(route) {
    if (route === "educacao") {
      const input = document.querySelector("#lesson-search");
      input.addEventListener("input", (event) => filterCurriculum(event.target.value));
      document.querySelectorAll("[data-curriculum-level]").forEach((button) => button.addEventListener("click", () => selectCurriculumLevel(button.dataset.curriculumLevel, true)));
      document.querySelectorAll("[data-toggle-module]").forEach((button) => button.addEventListener("click", () => {
        const module = document.querySelector(`#${button.dataset.toggleModule}`);
        const lessons = [...module.querySelectorAll(".lesson-accordion:not([hidden])")];
        const open = lessons.some((lesson) => !lesson.open);
        lessons.forEach((lesson) => {
          lesson.classList.remove("is-adjacent-above", "is-adjacent-below");
          lesson.open = open;
          lesson.classList.toggle("is-open", open);
        });
        button.textContent = open ? "Recolher aulas" : "Expandir aulas";
      }));
    }
    if (route === "biblioteca") {
      const input = document.querySelector("#material-search");
      const filter = document.querySelector("#material-filter");
      const update = () => renderMaterialResults(input.value, filter.value);
      renderMaterialResults();
      input.addEventListener("input", update);
      filter.addEventListener("change", update);
    }
    if (route === "marca") initSwatches(main);
  }

  /* ============ Render principal + ciclo de vida ============ */

  let cineTeardown = null;
  function render() {
    if (cineTeardown) { cineTeardown(); cineTeardown = null; }
    const route = currentRoute();
    const meta = data.routes.find((item) => item.id === route);
    if (!location.hash.startsWith(`#/${route}`)) history.replaceState(null, "", `#/${route}`);

    const paint = () => {
      renderNav(route);
      breadcrumb.textContent = meta.label;
      document.title = `${meta.label} \u2014 Logos Academy`;
      document.querySelectorAll("[data-mode]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === mode)));
      presentationNote.hidden = mode !== "presentation";
      main.innerHTML = renderers[route]();
      attachPageEvents(route);
      initReveals(main);
      initCounters(main);
      initTilt(main);
      initSpotlight(main);
      initSplitAccordion(main);
      initTimeline(main);
      initParallax(main);
      initScrollProgress(route);
      cineTeardown = initConstellation(main);
      closeMenu();
      const heading = main.querySelector("h1");
      heading.setAttribute("tabindex", "-1");
      window.scrollTo({ top: 0, behavior: "auto" });
      requestAnimationFrame(() => {
        const section = new URLSearchParams(location.hash.split("?")[1] || "").get("sec");
        heading.focus({ preventScroll: true });
        if (section) document.querySelector(`#${CSS.escape(section)}`)?.scrollIntoView({ block: "start" });
      });
    };

    if (document.startViewTransition && !respectsReducedMotion()) document.startViewTransition(paint);
    else paint();
  }

  function setMode(nextMode) {
    if (nextMode === mode) return;
    writeMode(nextMode);
    if (nextMode === "presentation" && currentRoute() === "decisoes") location.hash = "#/inicio";
    render();
    showToast(nextMode === "presentation" ? "Modo Apresenta\u00e7\u00e3o ativado." : "Modo Interno ativado.");
  }

  function openMenu() {
    sidebar.classList.add("is-open");
    menuButton.setAttribute("aria-expanded", "true");
    backdrop.hidden = false;
  }

  function closeMenu() {
    sidebar.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
    backdrop.hidden = true;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  menuButton.addEventListener("click", () => sidebar.classList.contains("is-open") ? closeMenu() : openMenu());
  backdrop.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
  window.addEventListener("hashchange", render);
  render();
})();
