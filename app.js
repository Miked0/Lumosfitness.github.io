// Application Data
const appData = {
  empresa: {
    nome: "Lumos Moda Fitness",
    slogan: "Luz que inspira movimento",
    descricao: "Criamos peças que acompanham mulheres reais na rotina, no treino e na vida",
    whatsapp: "(11) 99999-9999",
    email: "contato@lumosfitness.com",
    instagram: "@lumosmodafitness"
  },
  produtos: [
    {
      id: 1,
      nome: "Legging High Power Turquesa",
      preco: 189.90,
      precoOriginal: 239.90,
      categoria: "Leggings",
      descricao: "Legging de alta compressão com tecnologia dry-fit exclusiva",
      tamanhos: ["PP", "P", "M", "G", "GG"],
      cores: ["Turquesa", "Preto", "Rosa"],
      estoque: 25,
      destaque: true
    },
    {
      id: 2,
      nome: "Top Force Preto",
      preco: 159.90,
      categoria: "Tops",
      descricao: "Top esportivo com suporte médio e alças ajustáveis",
      tamanhos: ["PP", "P", "M", "G", "GG"],
      cores: ["Preto", "Branco", "Rosa"],
      estoque: 18,
      destaque: false
    },
    {
      id: 3,
      nome: "Conjunto Boss Completo",
      preco: 349.90,
      precoOriginal: 429.90,
      categoria: "Conjuntos",
      descricao: "Conjunto legging + top com modelagem exclusiva",
      tamanhos: ["PP", "P", "M", "G", "GG"],
      cores: ["Preto/Rosa", "Azul/Branco"],
      estoque: 12,
      destaque: true
    },
    {
      id: 4,
      nome: "Macaquinho Athleisure",
      preco: 269.90,
      categoria: "Macaquinhos",
      descricao: "Peça versátil para treino e uso casual",
      tamanhos: ["PP", "P", "M", "G", "GG"],
      cores: ["Preto", "Nude", "Verde"],
      estoque: 8,
      destaque: false
    },
    {
      id: 5,
      nome: "Short Essence Alta Compressão",
      preco: 189.90,
      categoria: "Shorts",
      descricao: "Short com compressão estratégica e bolsos laterais",
      tamanhos: ["PP", "P", "M", "G", "GG"],
      cores: ["Preto", "Cinza", "Rosa"],
      estoque: 20,
      destaque: false
    },
    {
      id: 6,
      nome: "Calça Wide Leg Comfort",
      preco: 249.90,
      categoria: "Calças",
      descricao: "Calça confortável para o dia a dia e yoga",
      tamanhos: ["PP", "P", "M", "G", "GG"],
      cores: ["Preto", "Bege", "Marinho"],
      estoque: 15,
      destaque: false
    }
  ],
  categorias: ["Todas", "Leggings", "Tops", "Conjuntos", "Macaquinhos", "Shorts", "Calças"],
  opcoesFrete: [
    { nome: "PAC", preco: 15.50, prazo: "8-12 dias úteis" },
    { nome: "SEDEX", preco: 25.80, prazo: "3-5 dias úteis" },
    { nome: "Loggi Express", preco: 35.00, prazo: "1-2 dias úteis" }
  ],
  depoimentos: [
    {
      nome: "Ana Silva",
      texto: "A qualidade das peças da Lumos é incrível! O caimento é perfeito e o tecido tem uma compressão ideal.",
      rating: 5
    },
    {
      nome: "Mariana Costa",
      texto: "Uso tanto na academia quanto no trabalho. As peças são super versáteis e estilosas!",
      rating: 5
    },
    {
      nome: "Júlia Santos",
      texto: "Marca brasileira de qualidade internacional. Recomendo para todas as amigas!",
      rating: 5
    }
  ]
};

// Application State
let appState = {
  currentPage: 'home',
  selectedProduct: null,
  cart: [],
  filteredProducts: [...appData.produtos],
  selectedCategory: 'Todas',
  searchTerm: '',
  selectedShipping: null,
  orderData: null
};

// Utility Functions
const formatPrice = (price) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

const generateProductIcon = () => {
  return `
    <svg width="60" height="60" viewBox="0 0 60 60" fill="currentColor">
      <rect width="60" height="60" rx="8" fill="currentColor" opacity="0.1"/>
      <circle cx="30" cy="20" r="8" fill="currentColor" opacity="0.4"/>
      <rect x="20" y="30" width="20" height="25" rx="2" fill="currentColor" opacity="0.4"/>
    </svg>
  `;
};

const showLoading = () => {
  document.getElementById('loading-overlay').classList.remove('hidden');
};

const hideLoading = () => {
  document.getElementById('loading-overlay').classList.add('hidden');
};

const showMessage = (message, type = 'success') => {
  // Simple toast message implementation
  const toast = document.createElement('div');
  toast.className = `status status--${type}`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 3000;
    min-width: 300px;
    padding: 12px 16px;
    border-radius: 8px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
};

// Navigation Functions
const showPage = (pageId) => {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show selected page
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.classList.add('active');
    targetPage.classList.add('fade-in');
  }
  
  // Update navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  const activeLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
  
  appState.currentPage = pageId;
  
  // Load page-specific content
  switch (pageId) {
    case 'home':
      loadFeaturedProducts();
      loadTestimonials();
      break;
    case 'products':
      loadAllProducts();
      loadCategoryFilter();
      break;
    case 'cart':
      loadCart();
      break;
    case 'checkout':
      loadCheckout();
      break;
    case 'admin':
      loadAdminPanel();
      break;
  }
};

// Product Functions
const createProductCard = (product) => {
  const hasDiscount = product.precoOriginal && product.precoOriginal > product.preco;
  const discountPercent = hasDiscount ? Math.round((1 - product.preco / product.precoOriginal) * 100) : 0;
  
  return `
    <div class="product-card" data-product-id="${product.id}">
      <div class="product-card__image">
        ${generateProductIcon()}
        ${hasDiscount ? `<div class="product-card__badge">${discountPercent}% OFF</div>` : ''}
      </div>
      <div class="product-card__content">
        <h4 class="product-card__title">${product.nome}</h4>
        <p class="product-card__description">${product.descricao}</p>
        <div class="product-card__price">
          <span class="price-current">${formatPrice(product.preco)}</span>
          ${hasDiscount ? `<span class="price-original">${formatPrice(product.precoOriginal)}</span>` : ''}
        </div>
        <div class="product-card__actions">
          <button class="btn btn--primary" onclick="openProductModal(${product.id})">Ver Detalhes</button>
          <button class="btn btn--secondary" onclick="quickAddToCart(${product.id})">Adicionar</button>
        </div>
      </div>
    </div>
  `;
};

const loadFeaturedProducts = () => {
  const featuredProducts = appData.produtos.filter(product => product.destaque);
  const container = document.getElementById('featured-products-grid');
  
  container.innerHTML = featuredProducts.map(product => createProductCard(product)).join('');
};

const loadAllProducts = () => {
  const container = document.getElementById('products-grid');
  container.innerHTML = appState.filteredProducts.map(product => createProductCard(product)).join('');
};

const loadCategoryFilter = () => {
  const select = document.getElementById('category-filter');
  select.innerHTML = appData.categorias.map(categoria => 
    `<option value="${categoria}" ${categoria === appState.selectedCategory ? 'selected' : ''}>${categoria}</option>`
  ).join('');
};

const filterProducts = () => {
  let filtered = [...appData.produtos];
  
  // Filter by category
  if (appState.selectedCategory !== 'Todas') {
    filtered = filtered.filter(product => product.categoria === appState.selectedCategory);
  }
  
  // Filter by search term
  if (appState.searchTerm) {
    const term = appState.searchTerm.toLowerCase();
    filtered = filtered.filter(product => 
      product.nome.toLowerCase().includes(term) ||
      product.descricao.toLowerCase().includes(term) ||
      product.categoria.toLowerCase().includes(term)
    );
  }
  
  appState.filteredProducts = filtered;
  loadAllProducts();
};

const openProductModal = (productId) => {
  const product = appData.produtos.find(p => p.id === productId);
  if (!product) return;
  
  appState.selectedProduct = product;
  
  const modalBody = document.getElementById('modal-body');
  const hasDiscount = product.precoOriginal && product.precoOriginal > product.preco;
  
  modalBody.innerHTML = `
    <div class="product-detail">
      <div class="product-detail__image">
        ${generateProductIcon()}
      </div>
      <div class="product-detail__info">
        <h2>${product.nome}</h2>
        <div class="product-detail__price">
          <span class="price-current">${formatPrice(product.preco)}</span>
          ${hasDiscount ? `<span class="price-original">${formatPrice(product.precoOriginal)}</span>` : ''}
        </div>
        <p>${product.descricao}</p>
        
        <div class="product-options">
          <div class="option-group">
            <label>Tamanho:</label>
            <div class="option-buttons" id="size-options">
              ${product.tamanhos.map(tamanho => 
                `<button class="option-btn" data-value="${tamanho}">${tamanho}</button>`
              ).join('')}
            </div>
          </div>
          
          <div class="option-group">
            <label>Cor:</label>
            <div class="option-buttons" id="color-options">
              ${product.cores.map(cor => 
                `<button class="option-btn" data-value="${cor}">${cor}</button>`
              ).join('')}
            </div>
          </div>
        </div>
        
        <div class="quantity-selector">
          <label>Quantidade:</label>
          <div class="quantity-controls">
            <button class="quantity-btn" onclick="changeQuantity(-1)">-</button>
            <input type="number" class="quantity-input" value="1" min="1" max="${product.estoque}" id="modal-quantity">
            <button class="quantity-btn" onclick="changeQuantity(1)">+</button>
          </div>
        </div>
        
        <div class="product-detail__actions">
          <button class="btn btn--primary btn--lg" onclick="addToCartFromModal()">Adicionar ao Carrinho</button>
        </div>
        
        <div class="product-info">
          <p><strong>Estoque disponível:</strong> ${product.estoque} unidades</p>
          <p><strong>Categoria:</strong> ${product.categoria}</p>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('product-modal').classList.remove('hidden');
  
  // Add option button event listeners
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // Remove active from siblings
      this.parentNode.querySelectorAll('.option-btn').forEach(sibling => {
        sibling.classList.remove('active');
      });
      // Add active to clicked button
      this.classList.add('active');
    });
  });
  
  // Select first options by default
  document.querySelector('#size-options .option-btn')?.classList.add('active');
  document.querySelector('#color-options .option-btn')?.classList.add('active');
};

const closeModal = () => {
  document.getElementById('product-modal').classList.add('hidden');
};

const changeQuantity = (delta) => {
  const input = document.getElementById('modal-quantity');
  const newValue = Math.max(1, Math.min(appState.selectedProduct.estoque, parseInt(input.value) + delta));
  input.value = newValue;
};

const quickAddToCart = (productId) => {
  const product = appData.produtos.find(p => p.id === productId);
  if (!product) return;
  
  const cartItem = {
    id: Date.now(),
    productId: product.id,
    nome: product.nome,
    preco: product.preco,
    tamanho: product.tamanhos[0],
    cor: product.cores[0],
    quantidade: 1,
    total: product.preco
  };
  
  appState.cart.push(cartItem);
  updateCartCount();
  showMessage('Produto adicionado ao carrinho!');
};

const addToCartFromModal = () => {
  if (!appState.selectedProduct) return;
  
  const selectedSize = document.querySelector('#size-options .option-btn.active')?.dataset.value;
  const selectedColor = document.querySelector('#color-options .option-btn.active')?.dataset.value;
  const quantity = parseInt(document.getElementById('modal-quantity').value);
  
  if (!selectedSize || !selectedColor) {
    showMessage('Por favor, selecione tamanho e cor', 'error');
    return;
  }
  
  const cartItem = {
    id: Date.now(),
    productId: appState.selectedProduct.id,
    nome: appState.selectedProduct.nome,
    preco: appState.selectedProduct.preco,
    tamanho: selectedSize,
    cor: selectedColor,
    quantidade: quantity,
    total: appState.selectedProduct.preco * quantity
  };
  
  appState.cart.push(cartItem);
  updateCartCount();
  closeModal();
  showMessage(`${quantity}x ${appState.selectedProduct.nome} adicionado ao carrinho!`);
};

// Cart Functions
const updateCartCount = () => {
  const count = appState.cart.reduce((sum, item) => sum + item.quantidade, 0);
  document.querySelector('.cart-count').textContent = count;
};

const loadCart = () => {
  const container = document.getElementById('cart-content');
  
  if (appState.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="8" cy="21" r="1"></circle>
          <circle cx="19" cy="21" r="1"></circle>
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57L23 6H6"></path>
        </svg>
        <h3>Seu carrinho está vazio</h3>
        <p>Adicione produtos para continuar</p>
        <button class="btn btn--primary" onclick="showPage('products')">Ver Produtos</button>
      </div>
    `;
    return;
  }
  
  const cartItems = appState.cart.map(item => `
    <div class="cart-item" data-item-id="${item.id}">
      <div class="cart-item__image">
        ${generateProductIcon()}
      </div>
      <div class="cart-item__info">
        <h4 class="cart-item__title">${item.nome}</h4>
        <div class="cart-item__details">
          Tamanho: ${item.tamanho} | Cor: ${item.cor}
        </div>
        <div class="cart-item__price">${formatPrice(item.preco)}</div>
      </div>
      <div class="cart-item__actions">
        <div class="quantity-controls">
          <button class="quantity-btn" onclick="updateCartItemQuantity(${item.id}, -1)">-</button>
          <span class="quantity-display">${item.quantidade}</span>
          <button class="quantity-btn" onclick="updateCartItemQuantity(${item.id}, 1)">+</button>
        </div>
        <button class="btn btn--outline" onclick="removeFromCart(${item.id})">Remover</button>
      </div>
    </div>
  `).join('');
  
  const subtotal = appState.cart.reduce((sum, item) => sum + item.total, 0);
  const shipping = appState.selectedShipping ? appState.selectedShipping.preco : 0;
  const total = subtotal + shipping;
  
  container.innerHTML = `
    <div class="cart-items">
      ${cartItems}
    </div>
    <div class="cart-summary">
      <div class="summary-row">
        <span>Subtotal:</span>
        <span>${formatPrice(subtotal)}</span>
      </div>
      ${shipping > 0 ? `
        <div class="summary-row">
          <span>Frete (${appState.selectedShipping.nome}):</span>
          <span>${formatPrice(shipping)}</span>
        </div>
      ` : ''}
      <div class="summary-row total">
        <span>Total:</span>
        <span>${formatPrice(total)}</span>
      </div>
      <button class="btn btn--primary btn--full-width" onclick="showPage('checkout')" ${appState.cart.length === 0 ? 'disabled' : ''}>
        Finalizar Compra
      </button>
    </div>
  `;
};

const updateCartItemQuantity = (itemId, delta) => {
  const item = appState.cart.find(i => i.id === itemId);
  if (!item) return;
  
  const newQuantity = Math.max(1, item.quantidade + delta);
  item.quantidade = newQuantity;
  item.total = item.preco * newQuantity;
  
  updateCartCount();
  loadCart();
};

const removeFromCart = (itemId) => {
  appState.cart = appState.cart.filter(item => item.id !== itemId);
  updateCartCount();
  loadCart();
  showMessage('Item removido do carrinho');
};

// Checkout Functions
const loadCheckout = () => {
  if (appState.cart.length === 0) {
    showPage('cart');
    return;
  }
  
  loadShippingOptions();
  loadCheckoutSummary();
};

const loadShippingOptions = () => {
  const container = document.getElementById('shipping-options');
  
  container.innerHTML = appData.opcoesFrete.map(opcao => `
    <div class="shipping-option" onclick="selectShipping('${opcao.nome}')">
      <input type="radio" name="frete" value="${opcao.nome}" ${appState.selectedShipping?.nome === opcao.nome ? 'checked' : ''}>
      <div class="shipping-info">
        <div class="shipping-name">${opcao.nome}</div>
        <div class="shipping-details">${opcao.prazo}</div>
      </div>
      <div class="shipping-price">${formatPrice(opcao.preco)}</div>
    </div>
  `).join('');
};

const selectShipping = (shippingName) => {
  appState.selectedShipping = appData.opcoesFrete.find(o => o.nome === shippingName);
  loadShippingOptions();
  loadCheckoutSummary();
  
  // Update visual selection
  document.querySelectorAll('.shipping-option').forEach(option => {
    option.classList.remove('selected');
  });
  event.currentTarget.classList.add('selected');
};

const loadCheckoutSummary = () => {
  const container = document.getElementById('checkout-summary');
  
  const subtotal = appState.cart.reduce((sum, item) => sum + item.total, 0);
  const shipping = appState.selectedShipping ? appState.selectedShipping.preco : 0;
  const total = subtotal + shipping;
  
  const itemsList = appState.cart.map(item => `
    <div class="summary-row">
      <span>${item.quantidade}x ${item.nome} (${item.tamanho}, ${item.cor})</span>
      <span>${formatPrice(item.total)}</span>
    </div>
  `).join('');
  
  container.innerHTML = `
    ${itemsList}
    <div class="summary-row">
      <span>Subtotal:</span>
      <span>${formatPrice(subtotal)}</span>
    </div>
    ${shipping > 0 ? `
      <div class="summary-row">
        <span>Frete:</span>
        <span>${formatPrice(shipping)}</span>
      </div>
    ` : ''}
    <div class="summary-row total">
      <span>Total:</span>
      <span>${formatPrice(total)}</span>
    </div>
  `;
};

const processCheckout = (formData) => {
  if (!appState.selectedShipping) {
    showMessage('Por favor, selecione uma opção de frete', 'error');
    return false;
  }
  
  showLoading();
  
  // Simulate API call
  setTimeout(() => {
    const subtotal = appState.cart.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + appState.selectedShipping.preco;
    
    appState.orderData = {
      id: Date.now(),
      items: [...appState.cart],
      customer: formData,
      shipping: appState.selectedShipping,
      subtotal,
      total,
      date: new Date().toLocaleDateString('pt-BR')
    };
    
    // Clear cart
    appState.cart = [];
    updateCartCount();
    
    hideLoading();
    showPage('success');
    showMessage('Pedido realizado com sucesso!');
  }, 2000);
  
  return true;
};

// Testimonials
const loadTestimonials = () => {
  const container = document.getElementById('testimonials-grid');
  
  container.innerHTML = appData.depoimentos.map(depoimento => `
    <div class="testimonial-card">
      <div class="testimonial-text">"${depoimento.texto}"</div>
      <div class="testimonial-author">${depoimento.nome}</div>
      <div class="testimonial-rating">${'★'.repeat(depoimento.rating)}</div>
    </div>
  `).join('');
};

// Admin Functions
const loadAdminPanel = () => {
  // Update stats
  const totalStock = appData.produtos.reduce((sum, product) => sum + product.estoque, 0);
  document.getElementById('total-products').textContent = appData.produtos.length;
  document.getElementById('total-stock').textContent = totalStock;
  document.getElementById('total-categories').textContent = appData.categorias.length - 1; // Exclude "Todas"
  
  // Load products table
  loadAdminProductsTable();
};

const loadAdminProductsTable = () => {
  const container = document.getElementById('admin-products-table');
  
  const getStockStatus = (stock) => {
    if (stock > 15) return { class: 'stock-status--high', text: 'Alto' };
    if (stock > 5) return { class: 'stock-status--medium', text: 'Médio' };
    return { class: 'stock-status--low', text: 'Baixo' };
  };
  
  const tableContent = `
    <div class="table-header">
      <div>Produto</div>
      <div>Categoria</div>
      <div>Preço</div>
      <div>Estoque</div>
      <div>Status</div>
    </div>
    ${appData.produtos.map(product => {
      const stockStatus = getStockStatus(product.estoque);
      return `
        <div class="table-row">
          <div>
            <strong>${product.nome}</strong>
            <br>
            <small style="color: var(--color-text-secondary);">${product.descricao}</small>
          </div>
          <div>${product.categoria}</div>
          <div>${formatPrice(product.preco)}</div>
          <div>${product.estoque}</div>
          <div>
            <span class="stock-status ${stockStatus.class}">${stockStatus.text}</span>
          </div>
        </div>
      `;
    }).join('')}
  `;
  
  container.innerHTML = tableContent;
};

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.dataset.page;
      showPage(page);
    });
  });
  
  // Header actions
  document.querySelectorAll('[data-action]').forEach(element => {
    element.addEventListener('click', function(e) {
      const action = this.dataset.action;
      
      switch (action) {
        case 'cart':
          showPage('cart');
          break;
        case 'shop-now':
          showPage('products');
          break;
        case 'close-modal':
          closeModal();
          break;
        case 'continue-shopping':
          showPage('products');
          break;
      }
    });
  });
  
  // Category filter
  document.getElementById('category-filter').addEventListener('change', function() {
    appState.selectedCategory = this.value;
    filterProducts();
  });
  
  // Search input
  document.getElementById('search-input').addEventListener('input', function() {
    appState.searchTerm = this.value;
    filterProducts();
  });
  
  // Checkout form
  document.getElementById('checkout-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());
    
    // Basic validation
    const requiredFields = ['nome', 'email', 'telefone', 'cpf', 'cep', 'rua', 'numero', 'bairro', 'cidade', 'pagamento'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      showMessage('Por favor, preencha todos os campos obrigatórios', 'error');
      return;
    }
    
    processCheckout(data);
  });
  
  // Footer category links
  document.querySelectorAll('[data-category]').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const category = this.dataset.category;
      appState.selectedCategory = category;
      showPage('products');
    });
  });
  
  // Initialize app
  showPage('home');
  updateCartCount();
});