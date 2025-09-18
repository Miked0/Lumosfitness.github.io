-- Inicialização do banco Lumos Moda Fitness
-- Executado automaticamente pelo Docker

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Tabela de produtos
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100),
    preco DECIMAL(10,2) NOT NULL,
    preco_original DECIMAL(10,2),
    imagem VARCHAR(500),
    tamanhos JSONB,
    cores JSONB,
    estoque INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    destaque BOOLEAN DEFAULT FALSE,
    omie_id VARCHAR(50),
    peso DECIMAL(5,3) DEFAULT 0.200,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    cpf VARCHAR(14) UNIQUE,
    data_nascimento DATE,
    ativo BOOLEAN DEFAULT TRUE,
    omie_id VARCHAR(50),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de endereços
CREATE TABLE enderecos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id),
    apelido VARCHAR(50),
    cep VARCHAR(9) NOT NULL,
    endereco VARCHAR(255) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    principal BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de pedidos
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id),
    status VARCHAR(50) DEFAULT 'pendente',
    subtotal DECIMAL(10,2) NOT NULL,
    frete DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    metodo_pagamento VARCHAR(50),
    dados_pagamento JSONB,
    endereco_entrega JSONB NOT NULL,
    dados_frete JSONB,
    observacoes TEXT,
    omie_id VARCHAR(50),
    mp_payment_id VARCHAR(100),
    codigo_rastreamento VARCHAR(100),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de itens do pedido
CREATE TABLE itens_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id),
    produto_id INTEGER REFERENCES produtos(id),
    quantidade INTEGER NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    tamanho VARCHAR(10),
    cor VARCHAR(50),
    subtotal DECIMAL(10,2) NOT NULL
);

-- Tabela de movimentações de estoque
CREATE TABLE movimentacoes_estoque (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER REFERENCES produtos(id),
    tipo VARCHAR(20) NOT NULL, -- entrada/saida
    quantidade INTEGER NOT NULL,
    motivo VARCHAR(100),
    pedido_id INTEGER REFERENCES pedidos(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    criado_por VARCHAR(100)
);

-- Tabela de sessões de carrinho
CREATE TABLE carrinhos (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    itens JSONB DEFAULT '[]',
    total DECIMAL(10,2) DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de logs de pagamento
CREATE TABLE logs_pagamento (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id),
    gateway VARCHAR(50),
    evento VARCHAR(100),
    dados JSONB,
    status VARCHAR(50),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configurações
CREATE TABLE configuracoes (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    descricao TEXT,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir produtos iniciais
INSERT INTO produtos (nome, descricao, categoria, preco, preco_original, tamanhos, cores, estoque, destaque, omie_id) VALUES
('Legging High Power Turquesa', 'Legging de alta compressão com tecnologia dry-fit exclusiva', 'Leggings', 189.90, 239.90, '["PP", "P", "M", "G", "GG"]', '["Turquesa", "Preto", "Rosa"]', 25, TRUE, 'LG001'),
('Top Force Preto', 'Top esportivo com suporte médio e alças ajustáveis', 'Tops', 159.90, NULL, '["PP", "P", "M", "G", "GG"]', '["Preto", "Branco", "Rosa"]', 18, FALSE, 'TP001'),
('Conjunto Boss Completo', 'Conjunto legging + top com modelagem exclusiva', 'Conjuntos', 349.90, 429.90, '["PP", "P", "M", "G", "GG"]', '["Preto/Rosa", "Azul/Branco"]', 12, TRUE, 'CJ001'),
('Macaquinho Athleisure', 'Peça versátil para treino e uso casual', 'Macaquinhos', 269.90, NULL, '["PP", "P", "M", "G", "GG"]', '["Preto", "Nude", "Verde"]', 8, FALSE, 'MC001'),
('Short Essence Alta Compressão', 'Short com compressão estratégica e bolsos laterais', 'Shorts', 189.90, NULL, '["PP", "P", "M", "G", "GG"]', '["Preto", "Cinza", "Rosa"]', 20, FALSE, 'SH001'),
('Calça Wide Leg Comfort', 'Calça confortável para o dia a dia e yoga', 'Calças', 249.90, NULL, '["PP", "P", "M", "G", "GG"]', '["Preto", "Bege", "Marinho"]', 15, FALSE, 'CL001');

-- Inserir configurações iniciais
INSERT INTO configuracoes (chave, valor, descricao) VALUES
('frete_gratis_minimo', '250.00', 'Valor mínimo para frete grátis'),
('taxa_mp', '4.99', 'Taxa do Mercado Pago em %'),
('cep_origem', '01310-100', 'CEP de origem para cálculo de frete'),
('email_contato', 'contato@lumosfitness.com', 'Email principal de contato'),
('whatsapp', '11999999999', 'WhatsApp para suporte'),
('instagram', '@lumosmodafitness', 'Perfil do Instagram');

-- Índices para performance
CREATE INDEX idx_produtos_categoria ON produtos(categoria);
CREATE INDEX idx_produtos_ativo ON produtos(ativo);
CREATE INDEX idx_produtos_destaque ON produtos(destaque);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_data ON pedidos(criado_em);
CREATE INDEX idx_itens_pedido ON itens_pedido(pedido_id);
CREATE INDEX idx_movimentacoes_produto ON movimentacoes_estoque(produto_id);
CREATE INDEX idx_carrinhos_session ON carrinhos(session_id);

-- Triggers para atualização de timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_carrinhos_updated_at BEFORE UPDATE ON carrinhos
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Views úteis
CREATE VIEW v_produtos_estoque_baixo AS
SELECT id, nome, categoria, estoque, preco
FROM produtos 
WHERE ativo = TRUE AND estoque < 5;

CREATE VIEW v_vendas_resumo AS
SELECT 
    DATE_TRUNC('day', criado_em) as data,
    COUNT(*) as total_pedidos,
    SUM(total) as faturamento,
    AVG(total) as ticket_medio
FROM pedidos 
WHERE status IN ('aprovado', 'enviado', 'entregue')
GROUP BY DATE_TRUNC('day', criado_em)
ORDER BY data DESC;

COMMIT;
