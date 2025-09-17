// Dados dos produtos e da aplicação
const appData = {
  "produtos": [
    {
      "id": 1,
      "nome": "Legging High Power",
      "preco": 149.90,
      "categoria": "Leggings",
      "imagem": "https://user-gen-media-assets.s3.amazonaws.com/gpt4o_images/e15ed7bf-e9a4-48ec-a7c2-309e91934782.png",
      "descricao": "Legging de alta compressão com tecnologia dry-fit",
      "tamanhos": ["PP", "P", "M", "G", "GG"],
      "cores": ["Preto", "Azul", "Rosa"]
    },
    {
      "id": 2,
      "nome": "Top Sport Comfort",
      "preco": 89.90,
      "categoria": "Tops",
      "imagem": "https://user-gen-media-assets.s3.amazonaws.com/gpt4o_images/e15ed7bf-e9a4-48ec-a7c2-309e91934782.png",
      "descricao": "Top esportivo com suporte médio e alças ajustáveis",
      "tamanhos": ["PP", "P", "M", "G", "GG"],
      "cores": ["Preto", "Branco", "Verde"]
    },
    {
      "id": 3,
      "nome": "Conjunto Active Power",
      "preco": 229.90,
      "categoria": "Conjuntos",
      "imagem": "https://user-gen-media-assets.s3.amazonaws.com/gpt4o_images/e15ed7bf-e9a4-48ec-a7c2-309e91934782.png",
      "descricao": "Conjunto completo: legging + top com modelagem exclusiva",
      "tamanhos": ["PP", "P", "M", "G", "GG"],
      "cores": ["Preto", "Azul marinho", "Marsala"]
    },
    {
      "id": 4,
      "nome": "Short Fit Pro",
      "preco": 119.90,
      "categoria": "Shorts",
      "imagem": "https://user-gen-media-assets.s3.amazonaws.com/gpt4o_images/e15ed7bf-e9a4-48ec-a7c2-309e91934782.png",
      "descricao": "Short com compressão estratégica e bolsos laterais",
      "tamanhos": ["PP", "P", "M", "G", "GG"],
      "cores": ["Preto", "Cinza", "Rosa"]
    },
    {
      "id": 5,
      "nome": "Calça Yoga Comfort",
      "preco": 139.90,
      "categoria": "Calças",
      "imagem": "https://user-gen-media-assets.s3.amazonaws.com/gpt4o_images/e15ed7bf-e9a4-48ec-a7c2-309e91934782.png",
      "descricao": "Calça confortável para o dia a dia e yoga",
      "tamanhos": ["PP", "P", "M", "G", "GG"],
      "cores": ["Preto", "Cáqui", "Azul petróleo"]
    }
  ],
  "marca": {
    "nome": "Lumos Moda Fitness",
    "slogan": "Luz que inspira movimento",
    "descricao": "Criamos peças que acompanham mulheres reais na rotina, no treino e na vida. Descubra a combinação perfeita entre estilo, conforto e qualidade brasileira.",
    "missao": "Criar roupas que acompanham mulheres reais em todos os momentos da vida - do treino mais intenso ao dia a dia corrido, sempre com o toque especial do design brasileiro.",
    "linhas": ["Active Power", "Athleisure Chic", "Gym Essentials"],
    "diferenciais": [
      {
        "titulo": "Tecnologia Avançada",
        "descricao": "Tecidos de alta tecnologia com propriedades de secagem rápida e compressão inteligente",
        "icone": "fas fa-microchip"
      },
      {
        "titulo": "Modelagem Exclusiva", 
        "descricao": "Cada peça é desenvolvida com modelagem exclusiva que valoriza o corpo feminino",
        "icone": "fas fa-cut"
      },
      {
        "titulo": "Qualidade Brasileira",
        "descricao": "Orgulhosamente fabricado no Brasil com os mais altos padrões de qualidade",
        "icone": "fas fa-flag"
      },
      {
        "titulo": "Versatilidade",
        "descricao": "Peças que funcionam perfeitamente para treino, trabalho e momentos de lazer",
        "icone": "fas fa-star"
      }
    ]
  },
  "depoimentos": [
    {
      "nome": "Ana Silva",
      "comentario": "A qualidade das peças da Lumos é incrível! O caimento é perfeito e o tecido tem uma compressão ideal.",
      "estrelas": 5
    },
    {
      "nome": "Carla Santos",
      "comentario": "Uso tanto na academia quanto no trabalho. As peças são super versáteis e estilosas!",
      "estrelas": 5
    },
    {
      "nome": "Juliana Costa",
      "comentario": "Marca brasileira de qualidade internacional. Recomendo para todas as amigas!",
      "estrelas": 5
    }
  ]
};

// Estado da aplicação
let state = {
  cart: [],
  currentFilter: 'todos',
  searchQuery: '',
  selectedProduct: null,
  selectedSize: 'M',
  selectedColor: 'Preto',
  orders: [],
  isAdminOpen: false
};

// Elementos DOM
const elements = {
  navToggle: document.getElementById('nav-toggle'),
  navMenu: document.getElementById('nav-menu'),
  searchInput: document.getElementById('search-input'),
  cartBtn: document.getElementById('cart-btn'),
  cartCount: document.getElementById('cart-count'),
  adminBtn: document.getElementById('admin-btn'),
  produtosGrid: document.getElementById('produtos-grid'),
  diferenciaisGrid: document.getElementById('diferenciais-grid'),
  depoimentosGrid: document.getElementById('depoimentos-grid'),
  
  // Modais
  produtoModal: document.getElementById('produto-modal'),
  cartModal: document.getElementById('cart-modal'),
  checkoutModal: document.getElementById('checkout-modal'),
  adminModal: document.getElementById('admin-modal'),
  
  // Botões de modal
  continueShopping: document.getElementById('continue-shopping'),
  checkoutBtn: document.getElementById('checkout-btn'),
  backToCart: document.getElementById('back-to-cart'),
  confirmOrder: document.getElementById('confirm-order')
};

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  setupEventListeners();
  loadProducts();
  loadDiferenciais();
  loadDepoimentos();
  updateCartDisplay();
});

function initializeApp() {
  // Smooth scrolling para links de navegação
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });
}

function setupEventListeners() {
  // Menu mobile
  elements.navToggle?.addEventListener('click', toggleMobileMenu);
  
  // Busca - corrigido para funcionar corretamente
  elements.searchInput?.addEventListener('input', handleSearch);
  
  // Carrinho - corrigido para abrir carrinho
  elements.cartBtn?.addEventListener('click', openCartModal);
  elements.continueShopping?.addEventListener('click', closeCartModal);
  elements.checkoutBtn?.addEventListener('click', openCheckoutModal);
  elements.backToCart?.addEventListener('click', backToCart);
  elements.confirmOrder?.addEventListener('click', confirmOrder);
  
  // Admin - corrigido para abrir admin
  elements.adminBtn?.addEventListener('click', openAdminModal);
  
  // Filtros
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      setActiveFilter(e.target.dataset.category);
      filterProducts();
    });
  });
  
  // Fechar modais
  document.querySelectorAll('.modal-close').forEach(element => {
    element.addEventListener('click', closeAllModals);
  });
  
  document.querySelectorAll('.modal-overlay').forEach(element => {
    element.addEventListener('click', closeAllModals);
  });
  
  // CTA Hero
  document.querySelector('.hero-cta')?.addEventListener('click', () => {
    document.querySelector('#produtos').scrollIntoView({ behavior: 'smooth' });
  });
  
  // Newsletter
  document.querySelector('.newsletter-form')?.addEventListener('submit', handleNewsletterSubmit);
  
  // Tabs do Admin
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      switchAdminTab(e.target.dataset.tab);
    });
  });
  
  // Adicionar produto do admin
  document.getElementById('add-product-btn')?.addEventListener('click', () => {
    showNotification('Funcionalidade de adicionar produto em desenvolvimento.');
  });
}

// Navegação mobile
function toggleMobileMenu() {
  elements.navMenu?.classList.toggle('active');
}

// Sistema de busca - corrigido
function handleSearch(e) {
  state.searchQuery = e.target.value.toLowerCase().trim();
  filterProducts();
}

// Sistema de filtros - corrigido
function setActiveFilter(category) {
  state.currentFilter = category;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-category="${category}"]`)?.classList.add('active');
}

function filterProducts() {
  let filteredProducts = appData.produtos;
  
  // Aplicar filtro de categoria
  if (state.currentFilter !== 'todos') {
    filteredProducts = filteredProducts.filter(produto => 
      produto.categoria === state.currentFilter
    );
  }
  
  // Aplicar filtro de busca
  if (state.searchQuery) {
    filteredProducts = filteredProducts.filter(produto => 
      produto.nome.toLowerCase().includes(state.searchQuery) || 
      produto.categoria.toLowerCase().includes(state.searchQuery) ||
      produto.descricao.toLowerCase().includes(state.searchQuery)
    );
  }
  
  renderProducts(filteredProducts);
}

// Carregamento e renderização de produtos
function loadProducts() {
  renderProducts(appData.produtos);
}

function renderProducts(produtos) {
  if (!elements.produtosGrid) return;
  
  if (produtos.length === 0) {
    elements.produtosGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-secondary);">
        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 16px; display: block;"></i>
        <p>Nenhum produto encontrado</p>
      </div>
    `;
    return;
  }
  
  elements.produtosGrid.innerHTML = produtos.map(produto => `
    <div class="produto-card" data-id="${produto.id}">
      <div class="produto-image" onclick="openProductModal(${produto.id})" style="cursor: pointer;">
        <img src="${produto.imagem}" alt="${produto.nome}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="produto-placeholder" style="display:none;">Imagem do Produto</div>
      </div>
      <div class="produto-info">
        <div class="produto-categoria">${produto.categoria}</div>
        <h3 class="produto-nome" onclick="openProductModal(${produto.id})" style="cursor: pointer;">${produto.nome}</h3>
        <div class="produto-preco">R$ ${produto.preco.toFixed(2).replace('.', ',')}</div>
        <div class="produto-actions">
          <button class="btn btn--primary btn-add-cart" onclick="addToCart(${produto.id})">
            Adicionar ao Carrinho
          </button>
          <button class="btn-details" onclick="openProductModal(${produto.id})" title="Ver detalhes">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Sistema de carrinho
function addToCart(productId, size = 'M', color = 'Preto') {
  const produto = appData.produtos.find(p => p.id === productId);
  if (!produto) return;
  
  const existingItem = state.cart.find(item => 
    item.id === productId && item.size === size && item.color === color
  );
  
  if (existingItem) {
    existingItem.quantity++;
  } else {
    state.cart.push({
      id: productId,
      nome: produto.nome,
      preco: produto.preco,
      size,
      color,
      quantity: 1,
      imagem: produto.imagem
    });
  }
  
  updateCartDisplay();
  showNotification(`${produto.nome} adicionado ao carrinho!`);
}

function removeFromCart(productId, size, color) {
  const index = state.cart.findIndex(item => 
    item.id === productId && item.size === size && item.color === color
  );
  
  if (index !== -1) {
    state.cart.splice(index, 1);
    updateCartDisplay();
    renderCartModal();
  }
}

function updateQuantity(productId, size, color, newQuantity) {
  const item = state.cart.find(item => 
    item.id === productId && item.size === size && item.color === color
  );
  
  if (item) {
    if (newQuantity <= 0) {
      removeFromCart(productId, size, color);
    } else {
      item.quantity = newQuantity;
      updateCartDisplay();
      renderCartModal();
    }
  }
}

function updateCartDisplay() {
  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  if (elements.cartCount) {
    elements.cartCount.textContent = totalItems;
    elements.cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
  }
}

function getCartTotal() {
  return state.cart.reduce((sum, item) => sum + (item.preco * item.quantity), 0);
}

// Modais - corrigido para funcionar adequadamente
function openProductModal(productId) {
  const produto = appData.produtos.find(p => p.id === productId);
  if (!produto || !elements.produtoModal) return;
  
  state.selectedProduct = produto;
  state.selectedSize = 'M';
  state.selectedColor = produto.cores[0] || 'Preto';
  
  const modalBody = document.getElementById('produto-modal-body');
  modalBody.innerHTML = `
    <div class="produto-modal-content">
      <div class="produto-modal-image">
        <img src="${produto.imagem}" alt="${produto.nome}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div style="display:none; align-items: center; justify-content: center; color: var(--color-text-secondary); font-size: 14px;">Imagem do Produto</div>
      </div>
      <div class="produto-modal-info">
        <h2>${produto.nome}</h2>
        <p class="produto-modal-preco">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p>
        <p>${produto.descricao}</p>
        
        <div class="produto-options">
          <h4>Tamanho:</h4>
          <div class="size-options">
            ${produto.tamanhos.map((tamanho, index) => `
              <button class="size-btn ${index === 2 ? 'active' : ''}" onclick="selectSize('${tamanho}', this)">${tamanho}</button>
            `).join('')}
          </div>
          
          <h4>Cor:</h4>
          <div class="color-options">
            ${produto.cores.map((cor, index) => `
              <button class="color-btn ${index === 0 ? 'active' : ''}" onclick="selectColor('${cor}', this)">${cor}</button>
            `).join('')}
          </div>
        </div>
        
        <button class="btn btn--primary btn--full-width" onclick="addToCartFromModal()">
          Adicionar ao Carrinho
        </button>
      </div>
    </div>
  `;
  
  elements.produtoModal.classList.remove('hidden');
}

function selectSize(size, element) {
  state.selectedSize = size;
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  element.classList.add('active');
}

function selectColor(color, element) {
  state.selectedColor = color;
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  element.classList.add('active');
}

function addToCartFromModal() {
  if (state.selectedProduct) {
    addToCart(state.selectedProduct.id, state.selectedSize, state.selectedColor);
    closeAllModals();
  }
}

function openCartModal() {
  if (!elements.cartModal) return;
  renderCartModal();
  elements.cartModal.classList.remove('hidden');
}

function closeCartModal() {
  elements.cartModal?.classList.add('hidden');
}

function renderCartModal() {
  const cartBody = document.getElementById('cart-modal-body');
  if (!cartBody) return;
  
  if (state.cart.length === 0) {
    cartBody.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart" style="font-size: 3rem; color: var(--color-text-secondary); margin-bottom: 16px;"></i>
        <p>Seu carrinho está vazio</p>
      </div>
    `;
    return;
  }
  
  const cartItems = state.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-image">
        <img src="${item.imagem}" alt="${item.nome}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div style="display:none; font-size: 10px; color: var(--color-text-secondary);">IMG</div>
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.nome}</div>
        <div class="cart-item-details">Tamanho: ${item.size} | Cor: ${item.color}</div>
        <div class="cart-item-controls">
          <div class="quantity-controls">
            <button class="quantity-btn" onclick="updateQuantity(${item.id}, '${item.size}', '${item.color}', ${item.quantity - 1})">-</button>
            <span>${item.quantity}</span>
            <button class="quantity-btn" onclick="updateQuantity(${item.id}, '${item.size}', '${item.color}', ${item.quantity + 1})">+</button>
          </div>
          <div class="cart-item-price">R$ ${(item.preco * item.quantity).toFixed(2).replace('.', ',')}</div>
          <button class="btn-remove" onclick="removeFromCart(${item.id}, '${item.size}', '${item.color}')" style="color: var(--color-error); background: none; border: none; cursor: pointer;">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
  
  cartBody.innerHTML = `
    ${cartItems}
    <div class="cart-total">
      <div class="cart-total-amount">Total: R$ ${getCartTotal().toFixed(2).replace('.', ',')}</div>
    </div>
  `;
}

function openCheckoutModal() {
  if (state.cart.length === 0) return;
  
  closeCartModal();
  elements.checkoutModal?.classList.remove('hidden');
  renderCheckoutSummary();
}

function backToCart() {
  elements.checkoutModal?.classList.add('hidden');
  openCartModal();
}

function renderCheckoutSummary() {
  const summaryContent = document.getElementById('checkout-summary-content');
  if (!summaryContent) return;
  
  const itemsHtml = state.cart.map(item => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>${item.nome} (${item.quantity}x)</span>
      <span>R$ ${(item.preco * item.quantity).toFixed(2).replace('.', ',')}</span>
    </div>
  `).join('');
  
  summaryContent.innerHTML = `
    ${itemsHtml}
    <div style="border-top: 1px solid var(--color-border); padding-top: 8px; margin-top: 8px;">
      <div style="display: flex; justify-content: space-between; font-weight: bold;">
        <span>Total:</span>
        <span>R$ ${getCartTotal().toFixed(2).replace('.', ',')}</span>
      </div>
    </div>
  `;
}

function confirmOrder() {
  const form = document.getElementById('checkout-form');
  if (!form) return;
  
  // Validação simples
  const requiredFields = form.querySelectorAll('[required]');
  let isValid = true;
  
  requiredFields.forEach(field => {
    if (!field.value.trim()) {
      isValid = false;
      field.style.borderColor = 'var(--color-error)';
    } else {
      field.style.borderColor = '';
    }
  });
  
  if (!isValid) {
    showNotification('Por favor, preencha todos os campos obrigatórios.');
    return;
  }
  
  const formData = new FormData(form);
  const orderData = {
    id: Date.now(),
    items: [...state.cart],
    total: getCartTotal(),
    customer: {
      nome: formData.get('nome'),
      email: formData.get('email'),
      telefone: formData.get('telefone'),
      cep: formData.get('cep'),
      cidade: formData.get('cidade'),
      estado: formData.get('estado')
    },
    pagamento: formData.get('pagamento'),
    data: new Date().toLocaleDateString('pt-BR')
  };
  
  state.orders.push(orderData);
  state.cart = [];
  
  updateCartDisplay();
  closeAllModals();
  
  showNotification('Pedido confirmado com sucesso! Você receberá um e-mail de confirmação.');
}

// Admin
function openAdminModal() {
  elements.adminModal?.classList.remove('hidden');
  renderAdminProducts();
  renderSalesReport();
}

function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById(`admin-${tab}`)?.classList.add('active');
}

function renderAdminProducts() {
  const productsList = document.getElementById('admin-produtos-list');
  if (!productsList) return;
  
  productsList.innerHTML = appData.produtos.map(produto => `
    <div class="admin-produto-item">
      <div>
        <strong>${produto.nome}</strong><br>
        <small>${produto.categoria} - R$ ${produto.preco.toFixed(2).replace('.', ',')}</small>
      </div>
      <div>
        <button class="btn btn--sm btn--outline" onclick="showNotification('Funcionalidade de edição em desenvolvimento.')">Editar</button>
      </div>
    </div>
  `).join('');
}

function renderSalesReport() {
  const salesReport = document.getElementById('sales-report');
  if (!salesReport) return;
  
  const totalVendas = state.orders.reduce((sum, order) => sum + order.total, 0);
  const totalPedidos = state.orders.length;
  
  salesReport.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div class="card">
        <div class="card__body">
          <h4>Total de Vendas</h4>
          <div style="font-size: 24px; font-weight: bold; color: var(--color-primary);">
            R$ ${totalVendas.toFixed(2).replace('.', ',')}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card__body">
          <h4>Pedidos Realizados</h4>
          <div style="font-size: 24px; font-weight: bold; color: var(--color-primary);">
            ${totalPedidos}
          </div>
        </div>
      </div>
    </div>
    
    ${state.orders.length > 0 ? `
      <h4>Últimos Pedidos</h4>
      ${state.orders.slice(-5).reverse().map(order => `
        <div class="card" style="margin-bottom: 8px;">
          <div class="card__body">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <strong>Pedido #${order.id}</strong><br>
                <small>${order.customer.nome} - ${order.data}</small>
              </div>
              <div style="text-align: right;">
                <strong>R$ ${order.total.toFixed(2).replace('.', ',')}</strong><br>
                <small>${order.items.length} item(s)</small>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    ` : '<p>Nenhum pedido realizado ainda.</p>'}
  `;
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.add('hidden');
  });
}

// Carregamento de dados estáticos
function loadDiferenciais() {
  if (!elements.diferenciaisGrid) return;
  
  elements.diferenciaisGrid.innerHTML = appData.marca.diferenciais.map(diferencial => `
    <div class="diferencial-card">
      <div class="diferencial-icon">
        <i class="${diferencial.icone}"></i>
      </div>
      <h3>${diferencial.titulo}</h3>
      <p>${diferencial.descricao}</p>
    </div>
  `).join('');
}

function loadDepoimentos() {
  if (!elements.depoimentosGrid) return;
  
  elements.depoimentosGrid.innerHTML = appData.depoimentos.map(depoimento => `
    <div class="depoimento-card">
      <div class="depoimento-stars">
        ${'★'.repeat(depoimento.estrelas)}${'☆'.repeat(5 - depoimento.estrelas)}
      </div>
      <p class="depoimento-texto">"${depoimento.comentario}"</p>
      <div class="depoimento-autor">${depoimento.nome}</div>
    </div>
  `).join('');
}

// Newsletter
function handleNewsletterSubmit(e) {
  e.preventDefault();
  const email = e.target.querySelector('input[type="email"]').value;
  if (email) {
    showNotification('Obrigada por se inscrever! Você receberá nossas novidades em breve.');
    e.target.reset();
  }
}

// Notificações
function showNotification(message) {
  // Criar notificação temporária
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--color-primary);
    color: var(--color-btn-primary-text);
    padding: 16px 24px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: var(--shadow-lg);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 300px;
    word-wrap: break-word;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Animar entrada
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Remover após 3 segundos
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Funções globais para eventos inline
window.addToCart = addToCart;
window.openProductModal = openProductModal;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.selectSize = selectSize;
window.selectColor = selectColor;
window.addToCartFromModal = addToCartFromModal;