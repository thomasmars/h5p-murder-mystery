import { createRoot } from 'react-dom/client';
import App from './ui/App.jsx';

// H5P entry point wrapping React UI.
window.H5P = window.H5P || {};

(function () {
  function MurderMysteryProto(params, contentId) {
    this.params = params || {};
    this.contentId = contentId;
  }

  MurderMysteryProto.prototype.attach = function ($container) {
    const container = $container.get(0);
    container.classList.add('h5p-mm');
    container.innerHTML = '';

    const mount = document.createElement('div');
    mount.className = 'h5p-mm__root';
    container.appendChild(mount);

    const instance = this;
    const root = createRoot(mount);
    root.render(
      <App
        params={this.params}
        contentId={this.contentId}
        requestResize={() => window.H5P && window.H5P.trigger(instance, 'resize')}
      />
    );
  };

  window.H5P.MurderMysteryProto = MurderMysteryProto;
})();
