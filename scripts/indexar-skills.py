"""Gera INDICE-SKILLS.md agrupando as 560 skills por categoria com descrição."""
import os, re, sys, io, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DEST = 'C:/Users/Logistica01/projetos/logistica-ia/docs/skills'
os.chdir(DEST)

# Categorias por prefixo/tema (kw = keyword no NOME da skill)
CATS = [
    ('AWS & Cloud',       ['cloud-aws', 'aws-', 'lambda', 'firebase', 's3-', 'terraform', 'kubernetes', 'k8s-', 'docker', 'cloud-']),
    ('Backend & API',     ['backend', 'api-', 'nodejs', 'fastapi', 'django', 'rails', 'laravel', 'nestjs', 'graphql', 'rest', 'webhook', 'auth-']),
    ('Frontend & UI',     ['frontend', 'react', 'nextjs', 'vue', 'svelte', 'ui-', 'design-', 'tailwind', 'component', 'responsive', 'nuxt', 'angular']),
    ('Mobile',            ['mobile', 'ios', 'android', 'flutter', 'react-native', 'swiftui', 'kotlin', 'compose', 'expo']),
    ('Database',          ['postgres', 'mysql', 'mongodb', 'sql-', 'database', 'db-', 'dbt', 'spark', 'elastic', 'redis', 'firestore']),
    ('AI / LLM / Agents', ['ai-', 'llm-', 'agent-', 'claude-', 'openai', 'rag-', 'embedding', 'vector', 'gpt', 'anthropic', 'prompt', 'safla', 'swarm', 'hive-mind']),
    ('DevOps & CI/CD',    ['devops', 'ci-cd', 'github', 'gitlab', 'deploy', 'monitor', 'observab', 'sre', 'chaos', 'incident', 'runbook']),
    ('Testing',           ['test', 'tdd-', 'e2e', 'unit-', 'mock', 'playwright', 'cypress', 'jest', 'pytest', 'benchmark', 'qa-']),
    ('Security',          ['security', 'auth-', 'oauth', 'jwt', 'crypto', 'ssl-', 'owasp', 'penetration', 'pentesting', 'firewall']),
    ('Data & Analytics',  ['data-', 'analytics', 'etl-', 'pipeline', 'airflow', 'metric', 'dashboard', 'kpi-', 'clickhouse', 'streaming']),
    ('Business & PM',     ['project-', 'product-', 'business', 'requirement', 'user-story', 'pm-', 'roadmap', 'startup-', 'market-', 'competitor']),
    ('Documentation',     ['docs-', 'markdown', 'obsidian', 'writing', 'article', 'blog-', 'seo-']),
    ('Python',            ['python-']),
    ('JavaScript / TS',   ['javascript', 'typescript', 'js-', 'ts-']),
    ('Rust / Go / C++',   ['rust-', 'golang', 'go-', 'cpp-', 'c-', 'systems-']),
    ('Java / .NET',       ['java-', 'kotlin-', 'csharp-', 'dotnet-', 'springboot']),
    ('Ruby / PHP / Elixir', ['ruby-', 'php-', 'elixir-', 'laravel', 'rails-']),
    ('Blockchain',        ['blockchain', 'web3', 'solidity', 'defi-', 'evm-', 'ethereum', 'nft-']),
    ('Logística Pontual', ['kpi-assistant', 'kpi_assistant', 'logistics-', 'returns-', 'weather-', 'analise-futebol']),
    ('Fluxo de trabalho', ['workflow', 'branch', 'ralphinho', 'santa-method', 'gan-', 'planning', 'context-', 'gitgood', 'hooks-', 'karpathy']),
    ('Docs & Diagram',    ['pdf-', 'pdf', 'pptx', 'docx', 'xlsx', 'excel', 'canvas-', 'mermaid', 'mockup', 'wireframe']),
    ('Marketplaces',      ['stripe', 'paypal', 'payment', 'billing', 'ecommerce', 'shop-', 'subscription']),
    ('Skills / Meta',     ['skill-', 'skills-', 'plugin-', 'marketplace-']),
]

skills = sorted(f for f in os.listdir('.') if f.endswith('.md') and f not in ('INDICE-SKILLS.md',))

def descricao(fname):
    try:
        content = open(fname, encoding='utf-8', errors='ignore').read(2500)
    except: return ''
    m = re.search(r'^\s*description:\s*[\"\']?(.+?)[\"\']?\s*$', content[:1500], re.M)
    if m:
        return m.group(1).strip()[:180]
    for line in content.splitlines():
        line = line.strip()
        if line and not line.startswith(('---','#','name:','type:','metadata','origin','description:','allowed-','tools:')):
            return line[:180]
    return ''

def categoria(nome):
    nome_lower = nome.lower()
    for cat, kws in CATS:
        if any(kw in nome_lower for kw in kws):
            return cat
    return 'Outros'

# Agrupa
grupos = {}
for s in skills:
    nome_skill = s[:-3]
    cat = categoria(nome_skill)
    grupos.setdefault(cat, []).append(nome_skill)

# Ordena categorias: Logística Pontual primeiro
ordem = ['Logística Pontual'] + sorted(k for k in grupos if k != 'Logística Pontual')

# Gera INDICE
out = []
out.append('# 🎯 Índice de Skills — 560 disponíveis no Claude Code\n')
out.append('Compilado automático. Cada linha: `[[skill]]` + descrição curta.\n')
out.append(f'**Total:** {len(skills)} skills · {sum(len(v) for v in grupos.values())} categorizadas.\n')
out.append('---\n')

for cat in ordem:
    items = grupos.get(cat, [])
    if not items: continue
    out.append(f'\n## {cat} ({len(items)})\n')
    for nome in sorted(items):
        d = descricao(f'{nome}.md')
        d_short = re.sub(r'\s+', ' ', d)[:150]
        if d_short:
            out.append(f'- [[{nome}]] — {d_short}')
        else:
            out.append(f'- [[{nome}]]')

with open('INDICE-SKILLS.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out) + '\n')

print(f'✅ INDICE-SKILLS.md criado')
print(f'   {len(skills)} skills em {len([c for c in grupos if grupos[c]])} categorias')
for cat in ordem:
    if grupos.get(cat):
        print(f'   · {cat}: {len(grupos[cat])}')
