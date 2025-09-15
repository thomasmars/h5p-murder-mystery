/* global H5P */
(function () {
    // Constructor
    H5P.MurderMysteryProto = function (params, contentId, extras) {
        this.params = params || {};
        this.contentId = contentId;
        this.extras = extras || {};
    };

    // Called by H5P to put content in DOM
    H5P.MurderMysteryProto.prototype.attach = function ($container) {
        const c = $container.get(0);
        c.classList.add('h5p-mm');

        const title = (this.params.intro && this.params.intro.title) || 'Murder Mystery (Prototype)';
        const lead = (this.params.intro && this.params.intro.lead) || 'Skriv inn innhold i editoren.';

        c.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'h5p-mm__wrap';

        const h = document.createElement('h2');
        h.textContent = title;

        const p = document.createElement('p');
        p.textContent = lead;

        wrap.appendChild(h);
        wrap.appendChild(p);
        c.appendChild(wrap);
    };
})();