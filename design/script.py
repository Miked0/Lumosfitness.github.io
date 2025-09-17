# Criando estrutura completa do projeto Lumos
import json
import os

# Estrutura de dados para produtos
produtos = [
    {
        "id": 1,
        "nome": "Legging High Power",
        "preco": 149.90,
        "categoria": "Leggings",
        "imagem": "/images/legging1.jpg",
        "descricao": "Legging de alta compressão com tecnologia dry-fit",
        "tamanhos": ["PP", "P", "M", "G", "GG"],
        "cores": ["Preto", "Azul", "Rosa"]
    },
    {
        "id": 2,
        "nome": "Top Sport Comfort",
        "preco": 89.90,
        "categoria": "Tops",
        "imagem": "/images/top1.jpg",
        "descricao": "Top esportivo com suporte médio e alças ajustáveis",
        "tamanhos": ["PP", "P", "M", "G", "GG"],
        "cores": ["Preto", "Branco", "Verde"]
    },
    {
        "id": 3,
        "nome": "Conjunto Active Power",
        "preco": 229.90,
        "categoria": "Conjuntos",
        "imagem": "/images/conjunto1.jpg",
        "descricao": "Conjunto completo: legging + top com modelagem exclusiva",
        "tamanhos": ["PP", "P", "M", "G", "GG"],
        "cores": ["Preto", "Azul marinho", "Marsala"]
    },
    {
        "id": 4,
        "nome": "Short Fit Pro",
        "preco": 119.90,
        "categoria": "Shorts",
        "imagem": "/images/short1.jpg",
        "descricao": "Short com compressão estratégica e bolsos laterais",
        "tamanhos": ["PP", "P", "M", "G", "GG"],
        "cores": ["Preto", "Cinza", "Rosa"]
    },
    {
        "id": 5,
        "nome": "Calça Yoga Comfort",
        "preco": 139.90,
        "categoria": "Calças",
        "imagem": "/images/calca1.jpg",
        "descricao": "Calça confortável para o dia a dia e yoga",
        "tamanhos": ["PP", "P", "M", "G", "GG"],
        "cores": ["Preto", "Cáqui", "Azul petróleo"]
    }
]

# Salvando dados de produtos em JSON
with open('produtos.json', 'w', encoding='utf-8') as f:
    json.dump(produtos, f, ensure_ascii=False, indent=2)

print("Arquivo produtos.json criado com sucesso!")
print(f"Total de produtos: {len(produtos)}")