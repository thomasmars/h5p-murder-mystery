import { createRoot } from 'react-dom/client';
import App from './ui/App.jsx';

// H5P entry point wrapping React UI.
window.H5P = window.H5P || {};

(function () {
  function MurderMysteryProto(params, contentId, extras) {
    this.params = params || {};
    this.contentId = contentId;
    this.extras = extras || {};
  }

  MurderMysteryProto.prototype.attach = function ($container) {
    // Accept either a jQuery object or a plain DOM element.
    let c = null;
    if ($container && typeof $container.get === 'function') {
      c = $container.get(0);
    } else if ($container && $container[0]) {
      c = $container[0];
    } else {
      c = $container; // assume it's a DOM element
    }
    c.classList.add('h5p-mm');
    c.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'h5p-mm__header';
    const title = (this.params.intro && this.params.intro.title) || 'Murder Mystery (Prototype)';
    const lead = (this.params.intro && this.params.intro.lead) || 'Skriv inn innhold i editoren.';
    header.innerHTML = `<h2>${title}</h2><p>${lead}</p>`;
    c.appendChild(header);

    const mount = document.createElement('div');
    mount.className = 'h5p-mm__root';
    c.appendChild(mount);

    const root = createRoot(mount);
    root.render(<App params={this.params} />);
  };

  window.H5P.MurderMysteryProto = MurderMysteryProto;
})();
