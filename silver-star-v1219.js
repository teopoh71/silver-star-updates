(() => {
  const catalog = window.SILVER_STAR_CATALOG;
  const grid = document.querySelector("#productGrid");
  const chips = document.querySelector("#categoryChips");
  const search = document.querySelector("#searchInput");
  const count = document.querySelector("#resultCount");
  const categoryLabel = document.querySelector("#currentCategoryLabel");
  const empty = document.querySelector("#emptyState");
  const dialog = document.querySelector("#detailDialog");
  const detail = document.querySelector("#detailContent");
  const onlineButton = document.querySelector("#onlineUpdateButton");
  const onlineStatus = document.querySelector("#onlineStatus");
  const onlineStatusDot = document.querySelector("#onlineStatusDot");
  const loadMoreButton = document.querySelector("#loadMoreButton");
  const zoomDialog = document.querySelector("#imageZoomDialog");
  const zoomImage = document.querySelector("#zoomImage");
  const zoomLevel = document.querySelector("#zoomLevel");
  const onlineRoot = "https://teopoh71.github.io/silver-star-updates/";
  const onlineManifestUrl = "https://raw.githubusercontent.com/teopoh71/silver-star-updates/main/online-manifest.json";
  const currentContentVersion = "v1219-image-zoom";
  const currentSiteUrl = `${onlineRoot}silver-star-v1219.html`;
  const pageSize = 24;
  let category = catalog.categories[0]?.slug || "";
  let visibleCount = pageSize;
  let imageScale = 1;
  const money = value => `RM ${Number(value).toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;
  const escape = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function setOnlineState(label, state = "online") {
    onlineStatus.textContent = label;
    onlineStatusDot.className = `status-dot ${state}`;
  }

  window.setSilverStarMode = mode => {
    if (mode === "online") setOnlineState("线上版", "online");
    else setOnlineState("离线备用", "offline");
  };

  async function refreshOnline() {
    onlineButton.disabled = true;
    onlineButton.textContent = "更新中…";
    setOnlineState("连接中…", "loading");
    if (window.SilverStarApp?.refreshOnline) {
      window.SilverStarApp.refreshOnline();
      return;
    }
    try {
      const response = await fetch(`${onlineManifestUrl}?cb=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      const target = new URL(manifest.contentVersion === currentContentVersion ? currentSiteUrl : (manifest.siteUrl || currentSiteUrl));
      target.searchParams.set("v", manifest.contentVersion || Date.now());
      target.searchParams.set("refresh", Date.now());
      location.href = target.toString();
    } catch (error) {
      setOnlineState("网络不可用", "offline");
      onlineButton.disabled = false;
      onlineButton.textContent = "重试更新";
    }
  }

  onlineButton.addEventListener("click", refreshOnline);
  if (location.protocol === "https:" && location.hostname === "teopoh71.github.io") setOnlineState("线上版", "online");
  else if (location.protocol === "file:") setOnlineState("离线备用", "offline");
  else setOnlineState("本机预览", navigator.onLine ? "online" : "offline");
  window.addEventListener("online", () => setOnlineState("网络已连接", "online"));
  window.addEventListener("offline", () => setOnlineState("网络不可用", "offline"));

  catalog.categories.forEach(item => {
    const button = document.createElement("button");
    button.className = `chip${item.slug === category ? " active" : ""}`;
    button.textContent = item.name;
    button.dataset.category = item.slug;
    button.addEventListener("click", () => { category = item.slug; visibleCount = pageSize; document.querySelectorAll(".chip").forEach(el => el.classList.toggle("active", el === button)); render(); });
    chips.append(button);
  });

  function searchable(product) { return [product.title, product.category, ...product.models, ...product.variants.flatMap(v => [v.label,v.size,v.material,v.notes])].join(" ").toLowerCase(); }
  function render() {
    const query = search.value.trim().toLowerCase();
    const products = catalog.products.filter(p => p.categorySlug === category && (!query || searchable(p).includes(query)));
    const visibleProducts = products.slice(0, visibleCount);
    count.textContent = products.length.toLocaleString();
    categoryLabel.textContent = catalog.categories.find(item => item.slug === category)?.name || "";
    empty.hidden = products.length > 0;
    grid.innerHTML = visibleProducts.map((p, index) => `<button class="card" data-id="${p.id}"><img src="${p.image}" alt="${escape(p.title)}" loading="lazy" decoding="async"${index < 4 ? ' fetchpriority="high"' : ""}><div class="card-body"><span class="category">${escape(p.category)}</span><span class="page">P.${p.page}</span><h2>${escape(p.title)}</h2>${p.sellingPrice ? `<div class="price">${money(p.sellingPrice)}${p.variants.length > 1 ? " 起" : ""}</div>` : '<div class="pending">报价待确认</div>'}</div></button>`).join("");
    loadMoreButton.hidden = visibleProducts.length >= products.length;
    loadMoreButton.textContent = `显示更多产品（${visibleProducts.length}/${products.length}）`;
  }

  grid.addEventListener("click", event => {
    const card = event.target.closest(".card"); if (!card) return;
    const p = catalog.products.find(item => item.id === card.dataset.id); if (!p) return;
    const variants = p.variants.length ? p.variants.map(v => `<div class="variant"><strong>${escape(v.label)}</strong>${v.size ? `<p>尺寸：${escape(v.size)}</p>` : ""}${v.material ? `<p>材质 / 颜色：${escape(v.material)}</p>` : ""}<div class="variant-price">${v.sellingPrices.map(money).join(" / ")}</div>${v.notes ? `<p>备注：${escape(v.notes)}</p>` : ""}</div>`).join("") : '<div class="variant"><p>报价表内暂未找到完全相同型号，请人工确认售价。</p></div>';
    detail.innerHTML = `<img class="detail-image" src="${p.image}" alt="${escape(p.title)}"><div class="detail-body"><span class="detail-category">${escape(p.category)} · 图册第 ${p.page} 页</span><h2>${escape(p.title)}</h2><div class="detail-price">${p.sellingPrice ? money(p.sellingPrice) + (p.variants.length > 1 ? " 起" : "") : "报价待确认"}</div>${variants}</div>`;
    dialog.showModal();
  });
  function setImageScale(nextScale) {
    imageScale = Math.min(4, Math.max(1, nextScale));
    zoomImage.style.transform = `scale(${imageScale})`;
    zoomLevel.textContent = `${Math.round(imageScale * 100)}%`;
  }
  detail.addEventListener("click", event => {
    const image = event.target.closest(".detail-image");
    if (!image) return;
    zoomImage.src = image.src;
    zoomImage.alt = image.alt;
    setImageScale(1);
    zoomDialog.showModal();
  });
  document.querySelector("#zoomInButton").addEventListener("click", () => setImageScale(imageScale + .5));
  document.querySelector("#zoomOutButton").addEventListener("click", () => setImageScale(imageScale - .5));
  document.querySelector("#zoomCloseButton").addEventListener("click", () => zoomDialog.close());
  zoomImage.addEventListener("dblclick", () => setImageScale(imageScale === 1 ? 2.5 : 1));
  zoomDialog.addEventListener("click", event => { if (event.target === zoomDialog) zoomDialog.close(); });
  dialog.querySelector(".close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  search.addEventListener("input", () => { visibleCount = pageSize; render(); });
  loadMoreButton.addEventListener("click", () => { visibleCount += pageSize; render(); });
  render();
})();
