# 🎯 Índice de Skills — 560 disponíveis no Claude Code

Compilado automático. Cada linha: `[[skill]]` + descrição curta.

**Total:** 560 skills · 560 categorizadas.

---


## Logística Pontual (5)

- [[kpi_assistant]] — Assistente para análise de indicadores logísticos e geração de relatórios executivos.
- [[logistics-exception-management]] — >
- [[returns-reverse-logistics]] — >
- [[weather-fetcher]] — Instructions for fetching current weather temperature data for Dubai, UAE from Open-Meteo API
- [[weather-svg-creator]] — Creates an SVG weather card showing the current temperature for Dubai. Writes the SVG to orchestration-workflow/weather.svg and updates orchestration-

## AI / LLM / Agents (37)

- [[agent-browser]] — Browser automation CLI for AI agents. Use when the user needs to interact with websites, including navigating pages, filling forms, clicking buttons, 
- [[agent-eval]] — Head-to-head comparison of coding agents (Claude Code, Aider, Codex, etc.) on custom tasks with pass rate, cost, time, and consistency metrics
- [[agent-harness-construction]] — Design and optimize AI agent action spaces, tool definitions, and observation formatting for higher completion rates.
- [[agent-introspection-debugging]] — Structured self-debugging workflow for AI agent failures using capture, diagnosis, contained recovery, and introspection reports.
- [[agent-payment-x402]] — Add x402 payment execution to AI agents — per-task budgets, spending controls, and non-custodial wallets via MCP tools. Use when agents need to pay fo
- [[agent-sort]] — Build an evidence-backed ECC install plan for a specific repo by sorting skills, commands, rules, hooks, and extras into DAILY vs LIBRARY buckets usin
- [[ai-first-engineering]] — Engineering operating model for teams where AI agents generate a large share of implementation output.
- [[ai-regression-testing]] — Regression testing strategies for AI-assisted development. Sandbox-mode API testing without database dependencies, automated bug-check workflows, and 
- [[autonomous-agent-harness]] — Transform Claude Code into a fully autonomous agent system with persistent memory, scheduled operations, computer use, and task queuing. Replaces stan
- [[claude-api]] — Anthropic Claude API patterns for Python and TypeScript. Covers Messages API, streaming, tool use, vision, extended thinking, batches, prompt caching,
- [[claude-code-history-files-finder]] — Finds and recovers content from Claude Code session history files. This skill should be used when searching for deleted files, tracking changes across
- [[claude-devfleet]] — Orchestrate multi-agent coding tasks via Claude DevFleet — plan projects, dispatch parallel agents in isolated worktrees, monitor progress, and read s
- [[claude-md-progressive-disclosurer]] — |
- [[claude-skills-troubleshooting]] — Diagnose and resolve Claude Code plugin and skill issues. This skill should be used when plugins are installed but not showing in available skills lis
- [[continue-claude-work]] — Recover actionable context from local `.claude` session artifacts and continue interrupted work without running `claude --resume`. This skill should b
- [[continuous-agent-loop]] — Patterns for continuous autonomous agent loops with quality gates, evals, and recovery controls.
- [[cost-aware-llm-pipeline]] — Cost optimization patterns for LLM API usage — model routing by task complexity, budget tracking, retry logic, and prompt caching.
- [[criar-prompts]] — 🎯 Objetivo: Criar prompts que gerem respostas precisas, profissionais e consistentes. ⚙️ Instruções: Entenda a intenção do usuário Defina objetivo e c
- [[embedding-strategies]] — Select and optimize embedding models for semantic search and RAG applications. Use when choosing embedding models, implementing chunking strategies, o
- [[enterprise-agent-ops]] — Operate long-lived agent workloads with observability, security boundaries, and lifecycle management.
- [[fal-ai-media]] — Unified media generation via fal.ai MCP — image, video, and audio. Covers text-to-image (Nano Banana), text/image-to-video (Seedance, Kling, Veo 3), t
- [[flow-nexus-swarm]] — Cloud-based AI swarm deployment and event-driven workflow automation with Flow Nexus platform
- [[hive-mind-advanced]] — |
- [[llm-evaluation]] — Implement comprehensive evaluation strategies for LLM applications using automated metrics, human feedback, and benchmarking. Use when testing LLM per
- [[llm-icon-finder]] — Finding and accessing AI/LLM model brand icons from lobe-icons library. Use when users need icon URLs, want to download brand logos for AI models/prov
- [[llm-trading-agent-security]] — Security patterns for autonomous trading agents with wallet or transaction authority. Covers prompt injection, spend limits, pre-send simulation, circ
- [[openai-prompts]] — >
- [[prompt-engineering-patterns]] — Master advanced prompt engineering techniques to maximize LLM performance, reliability, and controllability in production. Use when optimizing prompts
- [[prompt-optimizer]] — >-
- [[promptfoo-evaluation]] — Configures and runs LLM evaluation using Promptfoo framework. Use when setting up prompt testing, creating evaluation configs (promptfooconfig.yaml), 
- [[rag-implementation]] — Build Retrieval-Augmented Generation (RAG) systems for LLM applications with vector databases and semantic search. Use when implementing knowledge-gro
- [[regex-vs-llm-structured-text]] — Decision framework for choosing between regex and LLM when parsing structured text — start with regex, add LLM only for low-confidence edge cases.
- [[swarm-advanced]] — |
- [[swarm-orchestration]] — Orchestrate multi-agent swarms with agentic-flow for parallel task execution, dynamic topology, and intelligent coordination. Use when scaling beyond 
- [[using-agent-skills]] — Discovers and invokes agent skills. Use when starting a session or when you need to discover which skill applies to the current task. This is the meta
- [[v3-swarm-coordination]] — 15-agent hierarchical mesh coordination for v3 implementation. Orchestrates parallel execution across security, core, and integration domains followin
- [[vector-index-tuning]] — Optimize vector index performance for latency, recall, and memory. Use when tuning HNSW parameters, selecting quantization strategies, or scaling vect

## AWS & Cloud (13)

- [[auth-jwt-lambda]] — >
- [[cloud-aws]] — >
- [[deploy-aws-checklist]] — >
- [[docker-patterns]] — Docker and Docker Compose patterns for local development, container security, networking, volume strategies, and multi-service orchestration.
- [[hybrid-cloud-networking]] — Configure secure, high-performance connectivity between on-premises infrastructure and cloud platforms using VPN and dedicated connections. Use when b
- [[k8s-manifest-generator]] — Create production-ready Kubernetes manifests for Deployments, Services, ConfigMaps, and Secrets following best practices and security standards. Use w
- [[k8s-security-policies]] — Implement Kubernetes security policies including NetworkPolicy, PodSecurityPolicy, and RBAC for production-grade security. Use when securing Kubernete
- [[lambda-layers]] — >
- [[multi-cloud-architecture]] — Design multi-cloud architectures using a decision framework to select and integrate services across AWS, Azure, GCP, and OCI. Use when building multi-
- [[s3-file-handler]] — >
- [[terraform-module-library]] — Build reusable Terraform modules for AWS, Azure, GCP, and OCI infrastructure following infrastructure-as-code best practices. Use when creating infras
- [[terraform-skill]] — Operational traps for Terraform provisioners, multi-environment isolation, and zero-to-deployment reliability. Covers provisioner timing races, SSH co
- [[testes-lambda]] — >

## Backend & API (23)

- [[api-and-interface-design]] — Guides stable API and interface design. Use when designing APIs, module boundaries, or any public interface. Use when creating REST or GraphQL endpoin
- [[api-connector-builder]] — Build a new API connector or provider by matching the target repo's existing integration pattern exactly. Use when adding one more integration without
- [[api-design]] — REST API design patterns including resource naming, status codes, pagination, filtering, error responses, versioning, and rate limiting for production
- [[api-design-principles]] — Master REST and GraphQL API design principles to build intuitive, scalable, and maintainable APIs that delight developers. Use when designing new APIs
- [[api-rest-nodejs]] — >
- [[auth-implementation-patterns]] — Master authentication and authorization patterns including JWT, OAuth2, session management, and RBAC to build secure, scalable access control systems.
- [[backend-patterns]] — Backend architecture patterns, API design, database optimization, and server-side best practices for Node.js, Express, and Next.js API routes.
- [[django-patterns]] — Django architecture patterns, REST API design with DRF, ORM best practices, caching, signals, middleware, and production-grade Django apps.
- [[django-security]] — Django security best practices, authentication, authorization, CSRF protection, SQL injection prevention, XSS prevention, and secure deployment config
- [[django-tdd]] — Django testing strategies with pytest-django, TDD methodology, factory_boy, mocking, coverage, and testing Django REST Framework APIs.
- [[django-verification]] — Verification loop for Django projects: migrations, linting, tests with coverage, security scans, and deployment readiness checks before release or PR.
- [[dotnet-backend-patterns]] — Master C#/.NET backend development patterns for building robust APIs, MCP servers, and enterprise applications. Covers async/await, dependency injecti
- [[fastapi-templates]] — Create production-ready FastAPI projects with async patterns, dependency injection, and comprehensive error handling. Use when building new FastAPI ap
- [[laravel-patterns]] — Laravel architecture patterns, routing/controllers, Eloquent ORM, service layers, queues, events, caching, and API resources for production apps.
- [[laravel-plugin-discovery]] — Discover and evaluate Laravel packages via LaraPlugins.io MCP. Use when the user wants to find plugins, check package health, or assess Laravel/PHP co
- [[laravel-security]] — Laravel security best practices for authn/authz, validation, CSRF, mass assignment, file uploads, secrets, rate limiting, and secure deployment.
- [[laravel-tdd]] — Test-driven development for Laravel with PHPUnit and Pest, factories, database testing, fakes, and coverage targets.
- [[laravel-verification]] — Verification loop for Laravel projects: env checks, linting, static analysis, tests with coverage, security scans, and deployment readiness.
- [[nestjs-patterns]] — NestJS architecture patterns for modules, controllers, providers, DTO validation, guards, interceptors, config, and production-grade TypeScript backen
- [[nodejs-backend-patterns]] — Build production-ready Node.js backend services with Express/Fastify, implementing middleware patterns, error handling, authentication, database integ
- [[nodejs-keccak256]] — Prevent Ethereum hashing bugs in JavaScript and TypeScript. Node's sha3-256 is NIST SHA3, not Ethereum Keccak-256, and silently breaks selectors, sign
- [[openapi-spec-generation]] — Generate and maintain OpenAPI 3.1 specifications from code, design-first specs, and validation patterns. Use when creating API documentation, generati
- [[webhook-handler]] — >

## Blockchain (3)

- [[defi-protocol-templates]] — Implement DeFi protocols with production-ready templates for staking, AMMs, governance, and lending systems. Use when building decentralized finance a
- [[evm-token-decimals]] — Prevent silent decimal mismatch bugs across EVM chains. Covers runtime decimal lookup, chain-aware caching, bridged-token precision drift, and safe no
- [[nft-standards]] — Implement NFT standards (ERC-721, ERC-1155) with proper metadata handling, minting strategies, and marketplace integration. Use when creating NFT cont

## Business & PM (14)

- [[competitors-analysis]] — Analyze competitor repositories with evidence-based approach. Use when tracking competitors, creating competitor profiles, or generating competitive a
- [[market-research]] — Conduct market research, competitive analysis, investor due diligence, and industry intelligence with source attribution and decision-oriented summari
- [[market-sizing-analysis]] — Calculate TAM/SAM/SOM for market opportunities using top-down, bottom-up, and value theory methodologies. Use this skill when sizing markets, estimati
- [[product-analysis]] — Multi-path parallel product analysis with cross-model test-time compute scaling. Spawns parallel agents (Claude Code agent teams + Codex CLI) to explo
- [[product-capability]] — Translate PRD intent, roadmap asks, or product discussions into an implementation-ready capability plan that exposes constraints, invariants, interfac
- [[product-lens]] — Use this skill to validate the "why" before building, run product diagnostics, and pressure-test product direction before the request becomes an imple
- [[product-self-knowledge]] — Stop and consult this skill whenever your response would include specific facts about Anthropic's products. Covers: Claude Code (how to install, Node.
- [[project-flow-ops]] — Operate execution flow across GitHub and Linear by triaging issues and pull requests, linking active work, and keeping GitHub public-facing while Line
- [[python-project-structure]] — Python project organization, module architecture, and public API design. Use when setting up new projects, organizing modules, defining public interfa
- [[startup-financial-modeling]] — Build comprehensive 3-5 year financial models with revenue projections, cost structures, cash flow analysis, and scenario planning for early-stage sta
- [[utility-pm-skill-builder]] — Guides contributors from a PM skill idea to a complete Skill Implementation Packet aligned with pm-skills conventions. Runs gap analysis, validates th
- [[utility-pm-skill-iterate]] — Applies targeted improvements to an existing pm-skills skill based on feedback, validation reports, or convention changes. Reads current files, previe
- [[utility-pm-skill-validate]] — Audits an existing pm-skills skill against structural conventions and quality criteria. Produces a structured validation report with pass/fail checks,
- [[utility-update-pm-skills]] — Checks for newer pm-skills releases, compares local vs. latest version, previews what would change, and updates local files after user confirmation. G

## Data & Analytics (17)

- [[airflow-dag-patterns]] — Build production Apache Airflow DAGs with best practices for operators, sensors, testing, and deployment. Use when creating data pipelines, orchestrat
- [[clickhouse-io]] — ClickHouse database patterns, query optimization, analytics, and data engineering best practices for high-performance analytical workloads.
- [[dashboard-builder]] — Build monitoring dashboards that answer real operator questions for Grafana, SigNoz, and similar platforms. Use when turning metrics into a working da
- [[data-quality-frameworks]] — Implement data quality validation with Great Expectations, dbt tests, and data contracts. Use when building data quality pipelines, implementing valid
- [[data-scraper-agent]] — Build a fully automated AI-powered data collection agent for any public source — job boards, prices, news, GitHub, sports, anything. Scrapes on a sche
- [[data-storytelling]] — Transform data into compelling narratives using visualization, context, and persuasive structure. Use when presenting analytics to stakeholders, creat
- [[financial-data-collector]] — Collect real financial data for any US publicly traded company from free public sources (yfinance). Output structured JSON consumable by downstream fi
- [[gdpr-data-handling]] — Implement GDPR-compliant data handling with consent management, data subject rights, and privacy by design. Use when building systems that process EU 
- [[grafana-dashboards]] — Create and manage production Grafana dashboards for real-time visualization of system and application metrics. Use when building monitoring dashboards
- [[kpi-assistant]] — Assistente para análise de indicadores logísticos e geração de relatórios executivos.
- [[kpi-dashboard-design]] — Design effective KPI dashboards with metrics selection, visualization best practices, and real-time monitoring patterns. Use this skill when building 
- [[measure-dashboard-requirements]] — Specifies requirements for an analytics dashboard including metrics, visualizations, filters, and data sources. Use when requesting dashboards from da
- [[ml-pipeline-workflow]] — Build end-to-end MLOps pipelines from data preparation through model training, validation, and production deployment. Use when creating ML pipelines, 
- [[opensource-pipeline]] — Open-source pipeline: fork, sanitize, and package private projects for safe public release. Chains 3 agents (forker, sanitizer, packager). Triggers: '
- [[ralphinho-rfc-pipeline]] — RFC-driven multi-agent DAG execution pattern with quality gates, merge queues, and work unit orchestration.
- [[risk-metrics-calculation]] — Calculate portfolio risk metrics including VaR, CVaR, Sharpe, Sortino, and drawdown analysis. Use when measuring portfolio risk, implementing risk lim
- [[startup-metrics-framework]] — Track, calculate, and optimize key performance metrics for SaaS, marketplace, consumer, and B2B startups from seed through Series A, including unit ec

## Database (13)

- [[agentdb-advanced]] — Master advanced AgentDB features including QUIC synchronization, multi-database management, custom distance metrics, hybrid search, and distributed sy
- [[agentdb-learning]] — Create and train AI learning plugins with AgentDB's 9 reinforcement learning algorithms. Includes Decision Transformer, Q-Learning, SARSA, Actor-Criti
- [[agentdb-memory-patterns]] — Implement persistent memory patterns for AI agents using AgentDB. Includes session memory, long-term storage, pattern learning, and context management
- [[agentdb-optimization]] — Optimize AgentDB performance with quantization (4-32x memory reduction), HNSW indexing (150x faster search), caching, and batch operations. Use when o
- [[agentdb-vector-search]] — Implement semantic vector search with AgentDB for intelligent document retrieval, similarity matching, and context-aware querying. Use when building R
- [[database-migration]] — Execute database migrations across ORMs and platforms with zero-downtime strategies, data transformation, and rollback procedures. Use when migrating 
- [[database-migrations]] — Database migration best practices for schema changes, data migrations, rollbacks, and zero-downtime deployments across PostgreSQL, MySQL, and common O
- [[dbt-transformation-patterns]] — Master dbt (data build tool) for analytics engineering with model organization, testing, documentation, and incremental strategies. Use when building 
- [[dynamodb-patterns]] — >
- [[postgres-patterns]] — PostgreSQL database patterns for query optimization, schema design, indexing, and security. Based on Supabase best practices.
- [[postgresql]] — Use this skill when designing or reviewing a PostgreSQL-specific schema. Covers best-practices, data types, indexing, constraints, performance pattern
- [[spark-optimization]] — Optimize Apache Spark jobs with partitioning, caching, shuffle optimization, and memory tuning. Use when improving Spark performance, debugging slow j
- [[sql-optimization-patterns]] — Master SQL query optimization, indexing strategies, and EXPLAIN analysis to dramatically improve database performance and eliminate slow queries. Use 

## DevOps & CI/CD (16)

- [[auto-deploy-model]] — >
- [[ci-cd-and-automation]] — Automates CI/CD pipeline setup. Use when setting up or modifying build and deployment pipelines. Use when you need to automate quality gates, configur
- [[deployment-patterns]] — Deployment workflows, CI/CD pipeline patterns, Docker containerization, health checks, rollback strategies, and production readiness checklists for we
- [[deployment-pipeline-design]] — Design multi-stage CI/CD pipelines with approval gates, security checks, and deployment orchestration. Use this skill when designing zero-downtime dep
- [[github-actions-templates]] — Create production-ready GitHub Actions workflows for automated testing, building, and deploying applications. Use when setting up CI/CD with GitHub Ac
- [[github-code-review]] — Comprehensive GitHub code review with AI-powered swarm coordination
- [[github-contributor]] — Strategic guide for becoming an effective GitHub contributor. Covers opportunity discovery, project selection, high-quality PR creation, and reputatio
- [[github-multi-repo]] — |
- [[github-ops]] — GitHub repository operations, automation, and management. Issue triage, PR management, CI/CD operations, release management, and security monitoring u
- [[github-project-management]] — |
- [[github-release-management]] — |
- [[github-workflow-automation]] — |
- [[gitlab-ci-patterns]] — Build GitLab CI/CD pipelines with multi-stage workflows, caching, and distributed runners for scalable automation. Use when implementing GitLab CI/CD,
- [[incident-runbook-templates]] — Create structured incident response runbooks with step-by-step procedures, escalation paths, and recovery actions. Use this skill when building a serv
- [[python-observability]] — Python observability patterns including structured logging, metrics, and distributed tracing. Use when adding logging, implementing metrics collection
- [[service-mesh-observability]] — Implement comprehensive observability for service meshes including distributed tracing, metrics, and visualization. Use when setting up mesh monitorin

## Docs & Diagram (9)

- [[canvas-design]] — Create beautiful visual art in .png and .pdf documents using design philosophy. You should use this skill when the user asks to create a poster, piece
- [[code-review-excellence]] — Master effective code review practices to provide constructive feedback, catch bugs early, and foster knowledge sharing while maintaining team morale.
- [[docx]] — Use this skill whenever the user wants to create, read, edit, or manipulate Word documents (.docx files). Triggers include: any mention of 'Word doc',
- [[excel-automation]] — Create, parse, and control Excel files on macOS. Professional formatting with openpyxl, complex xlsm parsing with stdlib zipfile+xml for investment ba
- [[pdf]] — Use this skill whenever the user wants to do anything with PDF files. This includes reading or extracting text/tables from PDFs, combining or merging 
- [[pdf-reading]] — Use this skill when you need to read, inspect, or extract content from PDF files — especially when file content is NOT in your context and you need to
- [[pptx]] — Use this skill any time a .pptx file is involved in any way — as input, output, or both. This includes: creating slide decks, pitch decks, or presenta
- [[utility-mermaid-diagrams]] — Teaches PMs to create syntactically valid mermaid diagrams by selecting the right diagram type for their communication need, following syntax validity
- [[xlsx]] — Use this skill any time a spreadsheet file is the primary input or output. This means any task where the user wants to: open, read, edit, or fix an ex

## Documentation (3)

- [[article-writing]] — Write articles, guides, blog posts, tutorials, newsletter issues, and other long-form content in a distinctive voice derived from supplied examples or
- [[mimeng-writing]] — 咪蒙爆款文章写作技巧。适用于需要创作10万+阅读量爆款文章、情感共鸣类内容、故事叙事或社会议题评论时使用。掌握标题制造、开篇设计、情绪调动、金句提炼、故事叙事等核心技巧。
- [[postmortem-writing]] — Write effective blameless postmortems with root cause analysis, timelines, and action items. Use when conducting incident reviews, writing postmortem 

## Fluxo de trabalho (16)

- [[context-budget]] — Audits Claude Code context window consumption across agents, skills, MCP servers, and rules. Identifies bloat, redundant components, and produces prio
- [[context-driven-development]] — >-
- [[context-engineering]] — Optimizes agent context setup. Use when starting a new session, when agent output quality degrades, when switching between tasks, or when you need to 
- [[dmux-workflows]] — Multi-agent orchestration using dmux (tmux pane manager for AI agents). Patterns for parallel agent workflows across Claude Code, Codex, OpenCode, and
- [[gan-style-harness]] — GAN-inspired Generator-Evaluator agent harness for building high-quality applications autonomously. Based on Anthropic's March 2026 harness design pap
- [[git-advanced-workflows]] — Master advanced Git workflows including rebasing, cherry-picking, bisect, worktrees, and reflog to maintain clean history and recover from any situati
- [[git-workflow]] — Git workflow patterns including branching strategies, commit conventions, merge vs rebase, conflict resolution, and collaborative development best pra
- [[git-workflow-and-versioning]] — Structures git workflow practices. Use when making any code change. Use when committing, branching, resolving conflicts, or when you need to organize 
- [[gitops-workflow]] — Implement GitOps workflows with ArgoCD and Flux for automated, declarative Kubernetes deployments with continuous reconciliation. Use when implementin
- [[hooks-automation]] — Automated coordination, formatting, and learning from Claude Code operations using intelligent hooks with MCP integration. Includes pre/post task hook
- [[inventory-demand-planning]] — >
- [[karpathy-guidelines]] — Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical 
- [[planning-and-task-breakdown]] — Breaks work into ordered tasks. Use when you have a spec or clear requirements and need to break work into implementable tasks. Use when a task feels 
- [[santa-method]] — Multi-agent adversarial verification with convergence loop. Two independent review agents must both pass before output ships.
- [[workflow-orchestration-patterns]] — Design durable workflows with Temporal for distributed systems. Covers workflow vs activity separation, saga patterns, state management, and determini
- [[workflow-patterns]] — Use this skill when implementing tasks according to Conductor's TDD workflow, handling phase checkpoints, managing git commits for tasks, or understan

## Frontend & UI (25)

- [[angular-migration]] — Migrate from AngularJS to Angular using hybrid mode, incremental component rewriting, and dependency injection updates. Use when upgrading AngularJS a
- [[design-system]] — Use this skill to generate or audit design systems, check visual consistency, and review PRs that touch styling.
- [[design-system-patterns]] — Build scalable design systems with design tokens, theming infrastructure, and component architecture patterns. Use when creating design tokens, implem
- [[develop-design-rationale]] — Documents the reasoning behind design decisions including alternatives considered, trade-offs evaluated, and principles applied. Use when making signi
- [[frontend-design]] — Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, a
- [[frontend-patterns]] — Frontend development patterns for React, Next.js, state management, performance optimization, and UI best practices.
- [[frontend-slides]] — Create stunning, animation-rich HTML presentations from scratch or by converting PowerPoint files. Use when the user wants to build a presentation, co
- [[frontend-ui-engineering]] — Builds production-quality UIs. Use when building or modifying user-facing interfaces. Use when creating components, implementing layouts, managing sta
- [[nextjs-app-router-patterns]] — Master Next.js 14+ App Router with Server Components, streaming, parallel routes, and advanced data fetching. Use when building Next.js applications, 
- [[nextjs-turbopack]] — Next.js 16+ and Turbopack — incremental bundling, FS caching, dev speed, and when to use Turbopack vs webpack.
- [[nuxt4-patterns]] — Nuxt 4 app patterns for hydration safety, performance, route rules, lazy loading, and SSR-safe data fetching with useFetch and useAsyncData.
- [[python-design-patterns]] — Python design patterns including KISS, Separation of Concerns, Single Responsibility, and composition over inheritance. Use this skill when designing 
- [[react-modernization]] — Upgrade React applications to latest versions, migrate from class components to hooks, and adopt concurrent features. Use when modernizing React codeb
- [[react-native-architecture]] — Build production React Native apps with Expo, navigation, native modules, offline sync, and cross-platform patterns. Use when developing mobile apps, 
- [[react-native-design]] — Master React Native styling, navigation, and Reanimated animations for cross-platform mobile development. Use when building React Native apps, impleme
- [[react-state-management]] — Master modern React state management with Redux Toolkit, Zustand, Jotai, and React Query. Use when setting up global state, managing server state, or 
- [[responsive-design]] — Implement modern responsive layouts using container queries, fluid typography, CSS Grid, and mobile-first breakpoint strategies. Use when building ada
- [[swiftui-patterns]] — SwiftUI architecture patterns, state management with @Observable, view composition, navigation, performance optimization, and modern iOS/macOS UI best
- [[tailwind-design-system]] — Build scalable design systems with Tailwind CSS v4, design tokens, component libraries, and responsive patterns. Use when creating component libraries
- [[ui-demo]] — Record polished UI demo videos using Playwright. Use when the user asks to create a demo, walkthrough, screen recording, or tutorial video of a web ap
- [[ui-designer]] — Extract design systems from reference UI images and generate implementation-ready UI design prompts. Use when users provide UI screenshots/mockups and
- [[vercel-react-best-practices]] — React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React
- [[visual-design-foundations]] — Apply typography, color theory, spacing systems, and iconography principles to create cohesive visual designs. Use when establishing design tokens, bu
- [[web-component-design]] — Master React, Vue, and Svelte component patterns including CSS-in-JS, composition strategies, and reusable component architecture. Use when building U
- [[write-frontend-tests]] — Analyze the current branch diff against dev, plan integration tests for changed frontend pages/components, and write them. TRIGGER when user asks to w

## Java / .NET (5)

- [[dotnet-patterns]] — Idiomatic C# and .NET patterns, conventions, dependency injection, async/await, and best practices for building robust, maintainable .NET applications
- [[java-coding-standards]] — Java coding standards for Spring Boot services: naming, immutability, Optional usage, streams, exceptions, generics, and project layout.
- [[springboot-patterns]] — Spring Boot architecture patterns, REST API design, layered services, data access, caching, async processing, and logging. Use for Java Spring Boot ba
- [[springboot-tdd]] — Test-driven development for Spring Boot using JUnit 5, Mockito, MockMvc, Testcontainers, and JaCoCo. Use when adding features, fixing bugs, or refacto
- [[springboot-verification]] — Verification loop for Spring Boot projects: build, static analysis, tests with coverage, security scans, and diff review before release or PR.

## JavaScript / TS (5)

- [[artifacts-builder]] — Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend web technologies (React, Tailwind CSS, shadcn/ui
- [[meeting-insights-analyzer]] — Analyzes meeting transcripts and recordings to uncover behavioral patterns, communication insights, and actionable feedback. Identifies when you avoid
- [[modern-javascript-patterns]] — Master ES6+ features including async/await, destructuring, spread operators, arrow functions, promises, modules, iterators, generators, and functional
- [[secrets-management]] — Implement secure secrets management for CI/CD pipelines using Vault, AWS Secrets Manager, or native platform solutions. Use when handling sensitive cr
- [[typescript-advanced-types]] — Master TypeScript's advanced type system including generics, conditional types, mapped types, template literals, and utility types for building type-s

## Marketplaces (5)

- [[billing-automation]] — Build automated billing systems for recurring payments, invoicing, subscription lifecycle, and dunning management. Use when implementing subscription 
- [[customer-billing-ops]] — Operate customer billing workflows such as subscriptions, refunds, churn triage, billing-portal recovery, and plan analysis using connected billing to
- [[finance-billing-ops]] — Evidence-first revenue, pricing, refunds, team-billing, and billing-model truth workflow for ECC. Use when the user wants a sales snapshot, pricing co
- [[paypal-integration]] — Integrate PayPal payment processing with support for express checkout, subscriptions, and refund management. Use when implementing PayPal payments, pr
- [[stripe-integration]] — Implement Stripe payment processing for robust, PCI-compliant payment flows including checkout, subscriptions, and webhooks. Use when integrating Stri

## Mobile (13)

- [[android-clean-architecture]] — Clean Architecture patterns for Android and Kotlin Multiplatform projects — module structure, dependency rules, UseCases, Repositories, and data layer
- [[claude-export-txt-better]] — >
- [[compose-multiplatform-patterns]] — Compose Multiplatform and Jetpack Compose patterns for KMP projects — state management, navigation, theming, performance, and platform-specific UI.
- [[dart-flutter-patterns]] — Production-ready Dart and Flutter patterns covering null safety, immutable state, async composition, widget architecture, popular state management fra
- [[flutter-dart-code-review]] — Library-agnostic Flutter/Dart code review checklist covering widget best practices, state management patterns (BLoC, Riverpod, Provider, GetX, MobX, S
- [[iOS-APP-developer]] — Develops iOS/macOS applications with XcodeGen, SwiftUI, and SPM. Handles Apple Developer signing, notarization, and CI/CD pipelines. Triggers on Xcode
- [[kotlin-coroutines-flows]] — Kotlin Coroutines and Flow patterns for Android and KMP — structured concurrency, Flow operators, StateFlow, error handling, and testing.
- [[kotlin-exposed-patterns]] — JetBrains Exposed ORM patterns including DSL queries, DAO pattern, transactions, HikariCP connection pooling, Flyway migrations, and repository patter
- [[kotlin-ktor-patterns]] — Ktor server patterns including routing DSL, plugins, authentication, Koin DI, kotlinx.serialization, WebSockets, and testApplication testing.
- [[kotlin-patterns]] — Idiomatic Kotlin patterns, best practices, and conventions for building robust, efficient, and maintainable Kotlin applications with coroutines, null 
- [[kotlin-testing]] — Kotlin testing patterns with Kotest, MockK, coroutine testing, property-based testing, and Kover coverage. Follows TDD methodology with idiomatic Kotl
- [[mobile-android-design]] — Master Material Design 3 and Jetpack Compose patterns for building native Android apps. Use when designing Android interfaces, implementing Compose UI
- [[mobile-ios-design]] — Master iOS Human Interface Guidelines and SwiftUI patterns for building native iOS apps. Use when designing iOS interfaces, implementing SwiftUI views

## Outros (268)

- [[accessibility]] — Design, implement, and audit inclusive digital products using WCAG 2.2 Level AA
- [[accessibility-compliance]] — Implement WCAG 2.2 compliant interfaces with mobile accessibility, inclusive design patterns, and assistive technology support. Use when auditing acce
- [[anti-reversing-techniques]] — Understand anti-reversing, obfuscation, and protection techniques encountered during software analysis. Use this skill when analyzing malware evasion 
- [[architecture-decision-records]] — Capture architectural decisions made during Claude Code sessions as structured ADRs. Auto-detects decision moments, records context, alternatives cons
- [[architecture-patterns]] — Implement proven backend architecture patterns including Clean Architecture, Hexagonal Architecture, and Domain-Driven Design. Use this skill when des
- [[asr-transcribe-to-text]] — Transcribes audio and video files to text using Qwen3-ASR. Supports two modes — local MLX inference on macOS Apple Silicon (no API key, 15-27x realtim
- [[attack-tree-construction]] — Build comprehensive attack trees to visualize threat paths. Use when mapping attack scenarios, identifying defense gaps, or communicating security ris
- [[auto-sklearn]] — >
- [[automation-audit-ops]] — Evidence-first automation inventory and overlap audit workflow for ECC. Use when the user wants to know which jobs, hooks, connectors, MCP servers, or
- [[autonomous-loops]] — Patterns and architectures for autonomous Claude Code loops — from simple sequential pipelines to RFC-driven multi-agent DAG systems.
- [[bash-defensive-patterns]] — Master defensive Bash programming techniques for production-grade scripts. Use when writing robust shell scripts, CI/CD pipelines, or system utilities
- [[bazel-build-optimization]] — Optimize Bazel builds for large-scale monorepos. Use when configuring Bazel, implementing remote execution, or optimizing build performance for enterp
- [[binary-analysis-patterns]] — Master binary analysis patterns including disassembly, decompilation, control flow analysis, and code pattern recognition. Use when analyzing executab
- [[block-no-verify-hook]] — Configure a PreToolUse hook to prevent AI agents from skipping git pre-commit hooks with --no-verify and other bypass flags. Use when setting up Claud
- [[blueprint]] — >-
- [[brand-guidelines]] — Applies Anthropic's official brand colors and typography to any sort of artifact that may benefit from having Anthropic's look-and-feel. Use it when b
- [[brand-voice]] — Build a source-derived writing style profile from real posts, essays, launch notes, docs, or site copy, then reuse that profile across content, outrea
- [[browser]] — Web browser automation with AI-optimized snapshots for claude-flow agents
- [[browser-qa]] — Use this skill to automate visual testing and UI interaction verification using browser automation after deploying features.
- [[bun-runtime]] — Bun as runtime, package manager, bundler, and test runner. When to choose Bun vs Node, migration notes, and Vercel support.
- [[canary-watch]] — Use this skill to monitor a deployed URL for regressions after deploys, merges, or dependency upgrades.
- [[capture-screen]] — Programmatic screenshot capture on macOS. Find window IDs with Swift CGWindowListCopyWindowInfo, control application windows via AppleScript (zoom, sc
- [[carrier-relationship-management]] — >
- [[caveman]] — >
- [[caveman-commit]] — >
- [[caveman-help]] — >
- [[caveman-review]] — >
- [[changelog-automation]] — Automate changelog generation from commits, PRs, and releases following Keep a Changelog format. Use when setting up release workflows, generating rel
- [[changelog-generator]] — Automatically creates user-facing changelogs from git commits by analyzing commit history, categorizing changes, and transforming technical commits in
- [[chatbot-builder]] — >
- [[ck]] — Persistent per-project memory for Claude Code. Auto-loads project context on session start, tracks sessions with git activity, and writes to native me
- [[cli-demo-generator]] — Generates professional animated CLI demos as GIFs using VHS terminal recordings. Handles tape file creation, self-bootstrapping demos with hidden setu
- [[click-path-audit]] — Trace every user-facing button/touchpoint through its full state change sequence to find bugs where functions individually work but cancel each other 
- [[cloudflare-troubleshooting]] — Investigate and resolve Cloudflare configuration issues using API-driven evidence gathering. Use when troubleshooting ERR_TOO_MANY_REDIRECTS, SSL erro
- [[code-review-and-quality]] — Conducts multi-axis code review. Use before merging any change. Use when reviewing code written by yourself, another agent, or a human. Use when you n
- [[code-simplification]] — Simplifies code for clarity. Use when refactoring code for clarity without changing behavior. Use when code works but is harder to read, maintain, or 
- [[code-tour]] — Create CodeTour `.tour` files — persona-targeted, step-by-step walkthroughs with real file and line anchors. Use for onboarding tours, architecture wa
- [[codebase-onboarding]] — Analyze an unfamiliar codebase and generate a structured onboarding guide with architecture map, key entry points, conventions, and a starter CLAUDE.m
- [[coding-standards]] — Baseline cross-project coding conventions for naming, readability, immutability, and code-quality review. Use detailed frontend or backend skills for 
- [[competitive-ads-extractor]] — Extracts and analyzes competitors' ads from ad libraries (Facebook, LinkedIn, etc.) to understand what messaging, problems, and creative approaches ar
- [[competitive-landscape]] — Analyze competition, identify differentiation opportunities, and develop winning market positioning strategies using Porter's Five Forces, Blue Ocean 
- [[compress]] — >
- [[configure-ecc]] — Interactive installer for Everything Claude Code — guides users through selecting and installing skills and rules to user-level or project-level direc
- [[connect]] — Connect Claude to any app. Send emails, create issues, post messages, update databases - take real actions across Gmail, Slack, GitHub, Notion, and 10
- [[connect-apps]] — Connect Claude to external apps like Gmail, Slack, GitHub. Use this skill when the user wants to send emails, create issues, post messages, or take ac
- [[connections-optimizer]] — Reorganize the user's X and LinkedIn network with review-first pruning, add/follow recommendations, and channel-specific warm outreach drafted in the 
- [[content-engine]] — Create platform-native content systems for X, LinkedIn, TikTok, YouTube, newsletters, and repurposed multi-platform campaigns. Use when the user wants
- [[content-hash-cache-pattern]] — Cache expensive file processing results using SHA-256 content hashes — path-independent, auto-invalidating, with service layer separation.
- [[content-research-writer]] — Assists in writing high-quality content by conducting research, adding citations, improving hooks, iterating on outlines, and providing real-time feed
- [[continuous-learning]] — Automatically extract reusable patterns from Claude Code sessions and save them as learned skills for future use.
- [[continuous-learning-v2]] — Instinct-based learning system that observes sessions via hooks, creates atomic instincts with confidence scoring, and evolves them into skills/comman
- [[cost-optimization]] — Optimize cloud costs across AWS, Azure, GCP, and OCI through resource rightsizing, tagging strategies, reserved instances, and spending analysis. Use 
- [[council]] — Convene a four-voice council for ambiguous decisions, tradeoffs, and go/no-go calls. Use when multiple valid paths exist and you need structured disag
- [[cqrs-implementation]] — Implement Command Query Responsibility Segregation for scalable architectures. Use when separating read and write models, optimizing query performance
- [[criador-de-habilidades]] — Crie novas habilidades, modifique e melhore as existentes e meça o desempenho das habilidades. Use quando os usuários quiserem criar uma habilidade do
- [[crosspost]] — Multi-platform content distribution across X, LinkedIn, Threads, and Bluesky. Adapts content per platform using content-engine patterns. Never posts i
- [[customs-trade-compliance]] — >
- [[dataset-builder]] — >
- [[debugging-and-error-recovery]] — Guides systematic root-cause debugging. Use when tests fail, builds break, behavior doesn't match expectations, or you encounter any unexpected error.
- [[debugging-strategies]] — Master systematic debugging techniques, profiling tools, and root cause analysis to efficiently track down bugs across any codebase or technology stac
- [[deep-research]] — Multi-source deep research using firecrawl and exa MCPs. Searches the web, synthesizes findings, and delivers cited reports with source attribution. U
- [[define-hypothesis]] — Defines a testable hypothesis with clear success metrics and validation approach. Use when forming assumptions to test, designing experiments, or alig
- [[define-jtbd-canvas]] — Creates a Jobs to be Done canvas capturing the functional, emotional, and social dimensions of a customer job. Use when deeply understanding customer 
- [[define-opportunity-tree]] — Creates an opportunity solution tree mapping desired outcomes to opportunities and potential solutions. Use for outcome-driven product discovery, prio
- [[define-problem-statement]] — Creates a clear problem framing document with user impact, business context, and success criteria. Use when starting a new initiative, realigning a dr
- [[deliver-acceptance-criteria]] — Generates structured Given/When/Then acceptance criteria for a user story or feature slice. Use when translating product requirements into testable sc
- [[deliver-edge-cases]] — Documents edge cases, error states, boundary conditions, and recovery paths for a feature. Use during specification to ensure comprehensive coverage, 
- [[deliver-launch-checklist]] — Creates a comprehensive pre-launch checklist covering engineering, design, marketing, support, legal, and operations readiness. Use before releasing f
- [[deliver-prd]] — Creates a comprehensive Product Requirements Document that aligns stakeholders on what to build, why, and how success will be measured. Use when speci
- [[deliver-release-notes]] — Creates user-facing release notes that communicate new features, improvements, and fixes in clear, benefit-focused language. Use when shipping updates
- [[deliver-user-stories]] — Generates user stories with clear acceptance criteria from product requirements or feature descriptions. Use when breaking down features for sprint pl
- [[dependency-upgrade]] — Manage major dependency version upgrades with compatibility analysis, staged rollout, and comprehensive testing. Use when upgrading framework versions
- [[deprecation-and-migration]] — Manages deprecation and migration. Use when removing old systems, APIs, or features. Use when migrating users from one implementation to another. Use 
- [[develop-adr]] — Creates an Architecture Decision Record following the Nygard format to document significant technical decisions, their context, and consequences. Use 
- [[develop-solution-brief]] — Creates a concise one-page solution overview that communicates the proposed approach, key decisions, and trade-offs. Use when pitching solutions to st
- [[develop-spike-summary]] — Documents the results of a time-boxed technical or design exploration (spike). Use after completing a spike to capture learnings, findings, and recomm
- [[developer-growth-analysis]] — Analyzes your recent Claude Code chat history to identify coding patterns, development gaps, and areas for improvement, curates relevant learning reso
- [[discover-competitive-analysis]] — Creates a structured competitive analysis comparing features, positioning, and strategy across competitors. Use when entering a market, planning diffe
- [[discover-interview-synthesis]] — Synthesizes user research interviews into actionable insights, patterns, and recommendations. Use after conducting user interviews, customer calls, or
- [[discover-stakeholder-summary]] — Documents stakeholder needs, concerns, and influence for a project or initiative. Use when starting projects, managing complex stakeholder relationshi
- [[distributed-tracing]] — Implement distributed tracing with Jaeger and Tempo to track requests across microservices and identify performance bottlenecks. Use when debugging mi
- [[documentation-and-adrs]] — Records decisions and documentation. Use when making architectural decisions, changing public APIs, shipping features, or when you need to record cont
- [[documentation-lookup]] — Use up-to-date library and framework docs via Context7 MCP instead of training data. Activates for setup questions, API references, code examples, or 
- [[domain-name-brainstormer]] — Generates creative domain name ideas for your project and checks availability across multiple TLDs (.com, .io, .dev, .ai, etc.). Saves hours of brains
- [[douban-skill]] — >
- [[dual-mode]] — Optional skills for orchestrating Claude Code and headless Codex workers together.
- [[email-ops]] — Evidence-first mailbox triage, drafting, send verification, and sent-mail-safe follow-up workflow for ECC. Use when the user wants to organize email, 
- [[employment-contract-templates]] — Create employment contracts, offer letters, and HR policy documents following legal best practices. Use when drafting employment agreements, creating 
- [[energy-procurement]] — >
- [[error-handling-patterns]] — Master error handling patterns across languages including exceptions, Result types, error propagation, and graceful degradation to build resilient app
- [[error-tracking]] — >
- [[eval-harness]] — Formal evaluation framework for Claude Code sessions implementing eval-driven development (EDD) principles
- [[evaluation-methodology]] — PluginEval quality methodology — dimensions, rubrics, statistical methods, and scoring formulas. Use this skill when understanding how plugin quality 
- [[event-store-design]] — Design and implement event stores for event-sourced systems. Use when building event sourcing infrastructure, choosing event store technologies, or im
- [[exa-search]] — Neural search via Exa MCP for web, code, and company research. Use when the user needs web search, code examples, company intel, people lookup, or AI-
- [[fact-checker]] — Verifies factual claims in documents using web search and official sources, then proposes corrections with user confirmation. Use when the user asks t
- [[feedback-loop-ai]] — >
- [[file-organizer]] — Intelligently organizes your files and folders across your computer by understanding context, finding duplicates, suggesting better structures, and au
- [[file-reading]] — Use this skill when a file has been uploaded but its content is NOT in your context — only its path at /mnt/user-data/uploads/ is listed in an uploade
- [[fireworks-tech-graph]] — >-
- [[flow-nexus-neural]] — Train and deploy neural networks in distributed E2B sandboxes with Flow Nexus
- [[flow-nexus-platform]] — |
- [[foundation-lean-canvas]] — Produces a one-page lean canvas across nine interlocking blocks (problem, customer, UVP, solution, channels, revenue, cost, metrics, unfair advantage)
- [[foundation-meeting-agenda]] — Produces an attendee-facing agenda that sets what will be discussed, who owns each topic, and how time will be spent. Supports ten meeting type varian
- [[foundation-meeting-brief]] — Produces a private strategic preparation document for the user before a meeting that matters. Captures stakes, stakeholder positions and reads, ranked
- [[foundation-meeting-recap]] — Produces a topic-segmented post-meeting summary for attendees with decisions highlighted and actions captured inline per topic (plus a consolidated ac
- [[foundation-meeting-synthesize]] — Cross-meeting archaeology skill. Consumes multiple meeting recaps (or raw notes) over a period and surfaces patterns invisible in any single meeting. 
- [[foundation-models-on-device]] — Apple FoundationModels framework for on-device LLM — text generation, guided generation with @Generable, tool calling, and snapshot streaming in iOS 2
- [[foundation-persona]] — Generates an evidence-calibrated product or marketing persona using the canonical v2.5 output contract. Use when shaping artifact perspective, stress-
- [[foundation-stakeholder-update]] — Produces async communication to stakeholders, primarily non-attendees and secondarily some attendees who want a reference. Translates meeting outcomes
- [[gangtise-copilot]] — One-stop installer and companion for the full Gangtise (岗底斯投研) OpenAPI skill suite — 19 official skills covering data retrieval (OHLC 行情, 财务, 估值, 研报, 
- [[gateguard]] — Fact-forcing gate that blocks Edit/Write/Bash (including MultiEdit) and demands concrete investigation (importers, data schemas, user instruction) bef
- [[godot-gdscript-patterns]] — Master Godot 4 GDScript patterns including signals, scenes, state machines, and optimization. Use when building Godot games, implementing game systems
- [[google-workspace-ops]] — Operate across Google Drive, Docs, Sheets, and Slides as one workflow surface for plans, trackers, decks, and shared documents. Use when the user need
- [[hads]] — Use when writing technical documentation that needs to be readable by both humans and AI models, converting existing docs to HADS format, validating a
- [[healthcare-cdss-patterns]] — Clinical Decision Support System (CDSS) development patterns. Drug interaction checking, dose validation, clinical scoring (NEWS2, qSOFA), alert sever
- [[healthcare-emr-patterns]] — EMR/EHR development patterns for healthcare applications. Clinical safety, encounter workflows, prescription generation, clinical decision support int
- [[healthcare-eval-harness]] — Patient safety evaluation harness for healthcare application deployments. Automated test suites for CDSS accuracy, PHI exposure, clinical workflow int
- [[healthcare-phi-compliance]] — Protected Health Information (PHI) and Personally Identifiable Information (PII) compliance patterns for healthcare applications. Covers data classifi
- [[helm-chart-scaffolding]] — Design, organize, and manage Helm charts for templating and packaging Kubernetes applications with reusable configurations. Use when creating Helm cha
- [[hexagonal-architecture]] — Design, implement, and refactor Ports & Adapters systems with clear domain boundaries, dependency inversion, and testable use-case orchestration acros
- [[hipaa-compliance]] — HIPAA-specific entrypoint for healthcare privacy and security work. Use when a task is explicitly framed around HIPAA, PHI handling, covered entities,
- [[hookify-rules]] — This skill should be used when the user asks to create a hookify rule, write a hook rule, configure hookify, add a hookify rule, or needs guidance on 
- [[hybrid-search-implementation]] — Combine vector and keyword search for improved retrieval. Use when implementing RAG systems, building search engines, or when neither approach alone p
- [[i18n-expert]] — This skill should be used when setting up, auditing, or enforcing internationalization/localization in UI codebases (React/TS, i18next or similar, JSO
- [[idea-refine]] — Refines ideas iteratively. Refine ideas through structured divergent and convergent thinking. Use "idea-refine" or "ideate" to trigger.
- [[ima-copilot]] — One-stop companion and installer for the official Tencent IMA skill (腾讯 IMA / ima.qq.com). Handles zero-config installation to Claude Code / Codex / O
- [[image-enhancer]] — Improves the quality of images, especially screenshots, by enhancing resolution, sharpness, and clarity. Perfect for preparing images for presentation
- [[incremental-implementation]] — Delivers changes incrementally. Use when implementing any feature or change that touches more than one file. Use when you're about to write a large am
- [[interaction-design]] — Design and implement microinteractions, motion design, transitions, and user feedback patterns. Use when adding polish to UI interactions, implementin
- [[internal-comms]] — A set of resources to help me write all kinds of internal communications, using the formats that my company likes to use. Claude should use this skill
- [[investor-materials]] — Create and update pitch decks, one-pagers, investor memos, accelerator applications, financial models, and fundraising materials. Use when the user ne
- [[investor-outreach]] — Draft cold emails, warm intro blurbs, follow-ups, update emails, and investor communications for fundraising. Use when the user wants outreach to ange
- [[invoice-organizer]] — Automatically organizes invoices and receipts for tax preparation by reading messy files, extracting key information, renaming them consistently, and 
- [[iterate-lessons-log]] — Creates a structured lessons learned entry for organizational memory. Use after projects, incidents, or significant learnings to capture knowledge for
- [[iterate-pivot-decision]] — Documents a strategic pivot or persevere decision with the evidence, analysis, and rationale. Use when evaluating whether to change direction on a pro
- [[iterate-refinement-notes]] — Documents backlog refinement session outcomes including stories refined, estimates, questions raised, and decisions made. Use during or after refineme
- [[iterate-retrospective]] — Facilitates and documents a team retrospective capturing what went well, what to improve, and action items. Use at the end of sprints, projects, or mi
- [[iterative-retrieval]] — Pattern for progressively refining context retrieval to solve the subagent context problem
- [[jira-integration]] — Use this skill when retrieving Jira tickets, analyzing requirements, updating ticket status, adding comments, or transitioning issues. Provides Jira A
- [[jpa-patterns]] — JPA/Hibernate patterns for entity design, relationships, query optimization, transactions, auditing, indexing, pagination, and pooling in Spring Boot.
- [[knowledge-ops]] — Knowledge base management, ingestion, sync, and retrieval across multiple storage layers (local files, MCP memory, vector stores, Git repos). Use when
- [[langchain-architecture]] — Design LLM applications using LangChain 1.x and LangGraph for agents, memory, and tool integration. Use when building LangChain applications, implemen
- [[langsmith-fetch]] — Debug LangChain and LangGraph agents by fetching execution traces from LangSmith Studio. Use when debugging agent behavior, investigating errors, anal
- [[lead-intelligence]] — AI-native lead intelligence and outreach pipeline. Replaces Apollo, Clay, and ZoomInfo with agent-powered signal scoring, mutual ranking, warm path di
- [[lead-research-assistant]] — Identifies high-quality leads for your product or service by analyzing your business, searching for target companies, and providing actionable contact
- [[linkerd-patterns]] — Implement Linkerd service mesh patterns for lightweight, security-focused service mesh deployments. Use when setting up Linkerd, configuring traffic p
- [[liquid-glass-design]] — iOS 26 Liquid Glass design system — dynamic glass material with blur, reflection, and interactive morphing for SwiftUI, UIKit, and WidgetKit.
- [[macos-cleaner]] — Analyze and reclaim macOS disk space through intelligent cleanup recommendations. This skill should be used when users report disk space issues, need 
- [[manim-video]] — Build reusable Manim explainers for technical concepts, graphs, system diagrams, and product walkthroughs, then hand off to the wider ECC video stack 
- [[mckinsey-consultant-11]] — McKinsey顾问式问题解决系统。从商业问题出发,通过假设驱动的结构化分析方法,生成McKinsey风格研究报告和PPT。融合Problem Solving方法论、MECE原则、Issue Tree拆解、Hypotheses形成、Dummy Page设计、智能数据收集和专业PPT生成能力。
- [[mcp-builder]] — Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. 
- [[mcp-server-patterns]] — Build MCP servers with Node/TypeScript SDK — tools, resources, prompts, Zod validation, stdio vs Streamable HTTP. Use Context7 or official MCP docs fo
- [[measure-experiment-design]] — Designs an A/B test or experiment with clear hypothesis, variants, success metrics, sample size, and duration. Use when planning experiments to valida
- [[measure-experiment-results]] — Documents the results of a completed experiment or A/B test with statistical analysis, learnings, and recommendations. Use after experiments conclude 
- [[measure-instrumentation-spec]] — Specifies event tracking and analytics instrumentation requirements for a feature. Use when defining what data to collect, ensuring consistent trackin
- [[memory-forensics]] — Master memory forensics techniques including memory acquisition, process analysis, and artifact extraction using Volatility and related tools. Use whe
- [[memory-safety-patterns]] — Implement memory-safe programming with RAII, ownership, smart pointers, and resource management across Rust, C++, and C. Use when writing safe systems
- [[messages-ops]] — Evidence-first live messaging workflow for ECC. Use when the user wants to read texts or DMs, recover a recent one-time code, inspect a thread before 
- [[microservices-patterns]] — Design microservices architectures with service boundaries, event-driven communication, and resilience patterns. Use when building distributed systems
- [[ml-inference-api]] — >
- [[model-retraining]] — >
- [[model-versioning]] — >
- [[monorepo-management]] — Master monorepo management with Turborepo, Nx, and pnpm workspaces to build efficient, scalable multi-package repositories with optimized builds and d
- [[mtls-configuration]] — Configure mutual TLS (mTLS) for zero-trust service-to-service communication. Use when implementing zero-trust networking, certificate management, or s
- [[multi-reviewer-patterns]] — Coordinate parallel code reviews across multiple quality dimensions with finding deduplication, severity calibration, and consolidated reporting. Use 
- [[nanoclaw-repl]] — Operate and extend NanoClaw v2, ECC's zero-dependency session-aware REPL built on claude -p.
- [[nutrient-document-processing]] — Process, convert, OCR, extract, redact, sign, and fill documents using the Nutrient DWS API. Works with PDFs, DOCX, XLSX, PPTX, HTML, and images.
- [[nx-workspace-patterns]] — Configure and optimize Nx monorepo workspaces. Use when setting up Nx, configuring project boundaries, optimizing build caching, or implementing affec
- [[on-call-handoff-patterns]] — Master on-call shift handoffs with context transfer, escalation procedures, and documentation. Use this skill when transitioning on-call responsibilit
- [[onboarding-usuario]] — >
- [[open-pr]] — Open a pull request with proper PR template, test coverage, and review workflow. Guides agents through creating a PR that follows repo conventions, en
- [[openclaw-persona-forge]] — |-
- [[orchestrate]] — Meta-agent supervisor that manages a fleet of Claude Code agents running in tmux windows. Auto-discovers spare worktrees, spawns agents, monitors stat
- [[pair-programming]] — AI-assisted pair programming with multiple modes (driver/navigator/switch), real-time verification, quality monitoring, and comprehensive testing. Sup
- [[parallel-debugging]] — Debug complex issues using competing hypotheses with parallel investigation, evidence collection, and root cause arbitration. Use this skill when debu
- [[parallel-feature-development]] — Coordinate parallel feature development with file ownership strategies, conflict avoidance rules, and integration patterns for multi-agent implementat
- [[pci-compliance]] — Implement PCI DSS compliance requirements for secure handling of payment card data and payment systems. Use when securing payment processing, achievin
- [[performance-analysis]] — |
- [[performance-optimization]] — Optimizes application performance. Use when performance requirements exist, when you suspect performance regressions, or when Core Web Vitals or load 
- [[perl-patterns]] — Modern Perl 5.36+ idioms, best practices, and conventions for building robust, maintainable Perl applications.
- [[plankton-code-quality]] — Write-time code quality enforcement using Plankton — auto-formatting, linting, and Claude-powered fixes on every file edit via hooks.
- [[plano-saas]] — >
- [[pr-address]] — Address PR review comments and loop until CI green and all comments resolved. TRIGGER when user asks to address comments, fix PR feedback, respond to 
- [[pr-review]] — Review a PR for correctness, security, code quality, and testing issues. TRIGGER when user asks to review a PR, check PR quality, or give feedback on 
- [[prd]] — Generate a Product Requirements Document (PRD) for a new feature. Use when planning a feature, starting a new project, or when asked to create a PRD. 
- [[production-scheduling]] — >
- [[projection-patterns]] — Build read models and projections from event streams. Use when implementing CQRS read sides, building materialized views, or optimizing query performa
- [[prometheus-configuration]] — Set up Prometheus for comprehensive metric collection, storage, and monitoring of infrastructure and applications. Use when implementing metrics colle
- [[protocol-reverse-engineering]] — Master network protocol reverse engineering including packet analysis, protocol dissection, and custom protocol documentation. Use when analyzing netw
- [[pytorch-patterns]] — PyTorch deep learning patterns and best practices for building robust, efficient, and reproducible training pipelines, model architectures, and data l
- [[quality-nonconformance]] — >
- [[raffle-winner-picker]] — Picks random winners from lists, spreadsheets, or Google Sheets for giveaways, raffles, and contests. Ensures fair, unbiased selection with transparen
- [[ralph]] — Convert PRDs to prd.json format for the Ralph autonomous agent system. Use when you have an existing PRD and need to convert it to Ralph's JSON format
- [[reasoningbank-agentdb]] — Implement ReasoningBank adaptive learning with AgentDB's 150x faster vector database. Includes trajectory tracking, verdict judgment, memory distillat
- [[reasoningbank-intelligence]] — Implement adaptive learning with ReasoningBank for pattern recognition, strategy optimization, and continuous improvement. Use when building self-lear
- [[remotion-video-creation]] — Best practices for Remotion - Video creation in React. 29 domain-specific rules covering 3D, animations, audio, captions, charts, transitions, and mor
- [[repo-scan]] — Cross-stack source code asset audit — classifies every file, detects embedded third-party libraries, and delivers actionable four-level verdicts per m
- [[repomix-safe-mixer]] — Safely package codebases with repomix by automatically detecting and removing hardcoded credentials before packing. Use when packaging code for distri
- [[repomix-unmixer]] — Extracts files from repomix-packed repositories, restoring original directory structures from XML/Markdown/JSON formats. Activates when users need to 
- [[research-ops]] — Evidence-first current-state research workflow for ECC. Use when the user wants fresh facts, comparisons, enrichment, or a recommendation built from c
- [[rules-distill]] — Scan skills to extract cross-cutting principles and distill them into rules — append, revise, or create new rule files
- [[safety-guard]] — Use this skill to prevent destructive operations when working on production systems or running agents autonomously.
- [[saga-orchestration]] — Implement saga patterns for distributed transactions and cross-aggregate workflows. Use this skill when implementing distributed transactions across m
- [[sast-configuration]] — Configure Static Application Security Testing (SAST) tools for automated vulnerability detection in application code. Use when setting up security sca
- [[scrapling-skill]] — Install, troubleshoot, and use Scrapling CLI to extract HTML, Markdown, or text from webpages. Use this skill whenever the user mentions Scrapling, `u
- [[search-first]] — Research-before-coding workflow. Search for existing tools, libraries, and patterns before writing custom code. Invokes the researcher agent.
- [[seo]] — Audit, plan, and implement SEO improvements across technical SEO, on-page optimization, structured data, Core Web Vitals, and content strategy. Use wh
- [[setup-repo]] — Initialize a worktree-based repo layout for parallel development. Creates a main worktree, a reviews worktree for PR reviews, and N numbered work bran
- [[shellcheck-configuration]] — Master ShellCheck static analysis configuration and usage for shell script quality. Use when setting up linting infrastructure, fixing code issues, or
- [[shipping-and-launch]] — Prepares production launches. Use when preparing to deploy to production. Use when you need a pre-launch checklist, when setting up monitoring, when p
- [[similarity-search-patterns]] — Implement efficient similarity search with vector databases. Use when building semantic search, implementing nearest neighbor queries, or optimizing r
- [[slack-gif-creator]] — Toolkit for creating animated GIFs optimized for Slack, with validators for size constraints and composable animation primitives. This skill applies w
- [[slo-implementation]] — Define and implement Service Level Indicators (SLIs) and Service Level Objectives (SLOs) with error budgets and alerting. Use when establishing reliab
- [[social-graph-ranker]] — Weighted social-graph ranking for warm intro discovery, bridge scoring, and network gap analysis across X and LinkedIn. Use when the user wants the re
- [[source-driven-development]] — Grounds every implementation decision in official documentation. Use when you want authoritative, source-cited code free from outdated patterns. Use w
- [[statusline-generator]] — Configures and customizes Claude Code statuslines with multi-line layouts, cost tracking via ccusage, git status indicators, and customizable colors. 
- [[stream-chain]] — Stream-JSON chaining for multi-agent pipelines, data transformation, and sequential workflows
- [[stride-analysis-patterns]] — Apply STRIDE methodology to systematically identify threats. Use when analyzing system security, conducting threat modeling sessions, or creating secu
- [[swift-actor-persistence]] — Thread-safe data persistence in Swift using actors — in-memory cache with file-backed storage, eliminating data races by design.
- [[swift-concurrency-6-2]] — Swift 6.2 Approachable Concurrency — single-threaded by default, @concurrent for explicit background offloading, isolated conformances for main actor 
- [[tailored-resume-generator]] — Analyzes job descriptions and generates tailored resumes that highlight relevant experience, skills, and achievements to maximize interview chances
- [[task-coordination-strategies]] — Decompose complex tasks, design dependency graphs, and coordinate multi-agent work with proper task descriptions and workload balancing. Use this skil
- [[team-builder]] — Interactive agent picker for composing and dispatching parallel teams
- [[team-communication-protocols]] — Structured messaging protocols for agent team communication including message type selection, plan approval, shutdown procedures, and anti-patterns to
- [[team-composition-analysis]] — Design optimal team structures, hiring plans, compensation strategies, and equity allocation for early-stage startups from pre-seed through Series A. 
- [[team-composition-patterns]] — Design optimal agent team compositions with sizing heuristics, preset configurations, and agent type selection. Use this skill when deciding how many 
- [[teams-channel-post-writer]] — Creates educational Teams channel posts for internal knowledge sharing about Claude Code features, tools, and best practices. Applies when writing pos
- [[template-skill]] — Replace with description of the skill and when Claude should use it.
- [[terminal-ops]] — Evidence-first repo execution workflow for ECC. Use when the user wants a command run, a repo checked, a CI failure debugged, or a narrow fix pushed w
- [[theme-factory]] — Toolkit for styling artifacts with a theme. These artifacts can be slides, docs, reportings, HTML landing pages, etc. There are 10 pre-set themes with
- [[threat-mitigation-mapping]] — Map identified threats to appropriate security controls and mitigations. Use when prioritizing security investments, creating remediation plans, or va
- [[time-skill]] — Display the current time in Pakistan Standard Time (PKT, UTC+5). Use when the user asks for the current time, Pakistan time, or PKT.
- [[token-budget-advisor]] — >-
- [[track-management]] — Use this skill when creating, managing, or working with Conductor tracks - the logical work units for features, bugs, and refactors. Applies to spec.m
- [[transcript-fixer]] — Corrects speech-to-text transcription errors using dictionary rules and AI-powered analysis. Builds personalized correction databases that learn from 
- [[tunnel-doctor]] — Diagnoses and fixes conflicts between Tailscale and proxy/VPN tools (Shadowrocket, Clash, Surge) on macOS. Covers five conflict layers - (1) route hij
- [[turborepo-caching]] — Configure Turborepo for efficient monorepo builds with local and remote caching. Use when setting up Turborepo, optimizing build pipelines, or impleme
- [[twitter-algorithm-optimizer]] — Analyze and optimize tweets for maximum reach using Twitter's open-source algorithm insights. Rewrite and edit user tweets to improve engagement and v
- [[twitter-reader]] — Fetch Twitter/X post content including long-form Articles with full images and metadata. Use when Claude needs to retrieve tweet/article content, auth
- [[unified-notifications-ops]] — Operate notifications as one ECC-native workflow across GitHub, Linear, desktop alerts, hooks, and connected communication surfaces. Use when the real
- [[unity-ecs-patterns]] — Master Unity ECS (Entity Component System) with DOTS, Jobs, and Burst for high-performance game development. Use when building data-oriented games, op
- [[upcoming-release]] — This skill should be used when the user asks to "generate release notes", "list upcoming release PRs", "summarize upcoming release", "/upcoming-releas
- [[update-sdk]] — This skill should be used when the user asks to "update SDK", "bump SDK version", "pin SDK to a commit", "test unreleased SDK", "update agent-server i
- [[us-gov-shutdown-tracker]] — Track and analyze US government shutdown liquidity impacts by monitoring TGA (Treasury General Account), bank reserves, EFFR, and SOFR data from FRED 
- [[utility-slideshow-creator]] — Generates professional presentations from a JSON deck specification using 18 slide types with dark/light variants, content-to-layout decision logic, a
- [[uv-package-manager]] — Master the uv package manager for fast Python dependency management, virtual environments, and modern Python project workflows. Use when setting up Py
- [[v3-cli-modernization]] — CLI modernization and hooks system enhancement for claude-flow v3. Implements interactive prompts, command decomposition, enhanced hooks integration, 
- [[v3-core-implementation]] — Core module implementation for claude-flow v3. Implements DDD domains, clean architecture patterns, dependency injection, and modular TypeScript codeb
- [[v3-ddd-architecture]] — Domain-Driven Design architecture for claude-flow v3. Implements modular, bounded context architecture with clean separation of concerns and microkern
- [[v3-integration-deep]] — Deep agentic-flow@alpha integration implementing ADR-001. Eliminates 10,000+ duplicate lines by building claude-flow as specialized extension rather t
- [[v3-mcp-optimization]] — MCP server optimization and transport layer enhancement for claude-flow v3. Implements connection pooling, load balancing, tool registry optimization,
- [[v3-memory-unification]] — Unify 6+ memory systems into AgentDB with HNSW indexing for 150x-12,500x search improvements. Implements ADR-006 (Unified Memory Service) and ADR-009 
- [[v3-performance-optimization]] — Achieve aggressive v3 performance targets: 2.49x-7.47x Flash Attention speedup, 150x-12,500x search improvements, 50-75% memory reduction. Comprehensi
- [[verification-loop]] — A comprehensive verification system for Claude Code sessions.
- [[verification-quality]] — |
- [[video-comparer]] — This skill should be used when comparing two videos to analyze compression results or quality differences. Generates interactive HTML reports with qua
- [[video-downloader]] — Download YouTube videos with customizable quality and format options. Use this skill when the user asks to download, save, or grab YouTube videos. Sup
- [[video-editing]] — AI-assisted video editing workflows for cutting, structuring, and augmenting real footage. Covers the full pipeline from raw capture through FFmpeg, R
- [[videodb]] — See, Understand, Act on video and audio. See- ingest from local files, URLs, RTSP/live feeds, or live record desktop; return realtime context and play
- [[wcag-audit-patterns]] — Conduct WCAG 2.2 accessibility audits with automated testing, manual verification, and remediation guidance. Use when auditing websites for accessibil
- [[whatsapp-twilio]] — >
- [[windows-remote-desktop-connection-doctor]] — Diagnose Windows App (Microsoft Remote Desktop / Azure Virtual Desktop / W365) connection quality issues on macOS. Analyze transport protocol selectio
- [[worker-integration]] — Worker-Agent integration for intelligent task dispatch and performance tracking
- [[workspace-surface-audit]] — Audit the active repo, MCP servers, plugins, connectors, env surfaces, and harness setup, then recommend the highest-value ECC-native skills, hooks, a
- [[worktree]] — Set up a new git worktree for parallel development. Creates the worktree, copies .env files, installs dependencies, and generates Prisma client. TRIGG
- [[x-api]] — X/Twitter API integration for posting tweets, threads, reading timelines, search, and analytics. Covers OAuth auth patterns, rate limits, and platform
- [[youtube-downloader]] — Download YouTube videos and HLS streams (m3u8) from platforms like Mux, Vimeo, etc. using yt-dlp and ffmpeg. Use this skill when users request downloa

## Python (12)

- [[async-python-patterns]] — Master Python asyncio, concurrent programming, and async/await patterns for high-performance applications. Use when building async APIs, concurrent sy
- [[python-anti-patterns]] — Use this skill when reviewing Python code for common anti-patterns to avoid. Use as a checklist when reviewing code, before finalizing implementations
- [[python-background-jobs]] — Python background job patterns including task queues, workers, and event-driven architecture. Use when implementing async task processing, job queues,
- [[python-code-style]] — Python code style, linting, formatting, naming conventions, and documentation standards. Use when writing new code, reviewing style, configuring linte
- [[python-configuration]] — Python configuration management via environment variables and typed settings. Use when externalizing config, setting up pydantic-settings, managing se
- [[python-error-handling]] — Python error handling patterns including input validation, exception hierarchies, and partial failure handling. Use when implementing validation logic
- [[python-packaging]] — Create distributable Python packages with proper project structure, setup.py/pyproject.toml, and publishing to PyPI. Use when packaging Python librari
- [[python-patterns]] — Pythonic idioms, PEP 8 standards, type hints, and best practices for building robust, efficient, and maintainable Python applications.
- [[python-performance-optimization]] — Profile and optimize Python code using cProfile, memory profilers, and performance best practices. Use when debugging slow Python code, optimizing bot
- [[python-resilience]] — Python resilience patterns including automatic retries, exponential backoff, timeouts, and fault-tolerant decorators. Use when adding retry logic, imp
- [[python-resource-management]] — Python resource management with context managers, cleanup patterns, and streaming. Use when managing connections, file handles, implementing cleanup l
- [[python-type-safety]] — Python type safety with type hints, generics, protocols, and strict type checking. Use when adding type annotations, implementing generic classes, def

## Rust / Go / C++ (13)

- [[agentic-engineering]] — Operate as an agentic engineer using eval-first execution, decomposition, and cost-aware model routing.
- [[agentic-jujutsu]] — |
- [[cpp-coding-standards]] — C++ coding standards based on the C++ Core Guidelines (isocpp.github.io). Use when writing, reviewing, or refactoring C++ code to enforce modern, safe
- [[ecc-tools-cost-audit]] — Evidence-first ECC Tools burn and billing audit workflow. Use when investigating runaway PR creation, quota bypass, premium-model leakage, duplicate j
- [[go-concurrency-patterns]] — Master Go concurrency with goroutines, channels, sync primitives, and context. Use when building concurrent Go applications, implementing worker pools
- [[golang-patterns]] — Idiomatic Go patterns, best practices, and conventions for building robust, efficient, and maintainable Go applications.
- [[istio-traffic-management]] — Configure Istio traffic management including routing, load balancing, circuit breakers, and canary deployments. Use when implementing service mesh tra
- [[rust-async-patterns]] — Master Rust async programming with Tokio, async traits, error handling, and concurrent patterns. Use when building async Rust applications, implementi
- [[rust-patterns]] — Idiomatic Rust patterns, ownership, error handling, traits, concurrency, and best practices for building safe, performant applications.
- [[sparc-methodology]] — |
- [[spec-driven-development]] — Creates specs before coding. Use when starting a new project, feature, or significant change and no specification exists yet. Use when requirements ar
- [[strategic-compact]] — Suggests manual context compaction at logical intervals to preserve context through task phases rather than arbitrary auto-compaction.
- [[visa-doc-translate]] — Translate visa application documents (images) to English and create a bilingual PDF with original and translation

## Security (11)

- [[defi-amm-security]] — Security checklist for Solidity AMM contracts, liquidity pools, and swap flows. Covers reentrancy, CEI ordering, donation or inflation attacks, oracle
- [[owasp-security]] — Use when reviewing code for security vulnerabilities, implementing authentication/authorization, handling user input, or discussing web application se
- [[perl-security]] — Comprehensive Perl security covering taint mode, input validation, safe process execution, DBI parameterized queries, web security (XSS/SQLi/CSRF), an
- [[security-and-hardening]] — Hardens code against vulnerabilities. Use when handling user input, authentication, data storage, or external integrations. Use when building any feat
- [[security-bounty-hunter]] — Hunt for exploitable, bounty-worthy security issues in repositories. Focuses on remotely reachable vulnerabilities that qualify for real reports inste
- [[security-requirement-extraction]] — Derive security requirements from threat models and business context. Use when translating threats into actionable requirements, creating security use
- [[security-review]] — Use this skill when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive featur
- [[security-scan]] — Scan your Claude Code configuration (.claude/ directory) for security vulnerabilities, misconfigurations, and injection risks using AgentShield. Check
- [[solidity-security]] — Master smart contract security best practices to prevent common vulnerabilities and implement secure Solidity patterns. Use when writing smart contrac
- [[springboot-security]] — Spring Security best practices for authn/authz, validation, CSRF, secrets, headers, rate limiting, and dependency security in Java Spring Boot service
- [[v3-security-overhaul]] — Complete security architecture overhaul for claude-flow v3. Addresses critical CVEs (CVE-1, CVE-2, CVE-3) and implements secure-by-default patterns. U

## Skills / Meta (9)

- [[marketplace-dev]] — |
- [[skill-builder]] — Create new Claude Code Skills with proper YAML frontmatter, progressive disclosure structure, and complete directory organization. Use when you need t
- [[skill-comply]] — Visualize whether skills, rules, and agent definitions are actually followed — auto-generates scenarios at 3 prompt strictness levels, runs agents, cl
- [[skill-creator]] — Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or opt
- [[skill-de-prom-it]] — Lista lógica de ações CRITÉRIOS Padrões de qualidade esperados ## FORMATO DA RESPOSTA Como a saída deve ser entregue OBSERVAÇÕES Restrições ou cuidado
- [[skill-reviewer]] — Reviews and improves Claude Code skills against official best practices. Supports three modes - self-review (validate your own skills), external revie
- [[skill-share]] — A skill that creates new Claude skills and automatically shares them on Slack using Rube for seamless team collaboration and skill discovery.
- [[skill-stocktake]] — Use when auditing Claude skills and commands for quality. Supports Quick Scan (changed skills only) and Full Stocktake modes with sequential subagent 
- [[skills-search]] — This skill should be used when users want to search, discover, install, or manage Claude Code skills from the CCPM registry. Triggers include requests

## Testing (25)

- [[backtesting-frameworks]] — Build robust backtesting systems for trading strategies with proper handling of look-ahead bias, survivorship bias, and transaction costs. Use when de
- [[bats-testing-patterns]] — Master Bash Automated Testing System (Bats) for comprehensive shell script testing. Use when writing tests for shell scripts, CI/CD pipelines, or requ
- [[benchmark]] — Use this skill to measure performance baselines, detect regressions before/after PRs, and compare stack alternatives.
- [[browser-testing-with-devtools]] — Tests in real browsers. Use when building or debugging anything that runs in a browser. Use when you need to inspect the DOM, capture console errors, 
- [[cpp-testing]] — Use only when writing/updating/fixing C++ tests, configuring GoogleTest/CTest, diagnosing failing or flaky tests, or adding coverage/sanitizers.
- [[cross-repo-testing]] — This skill should be used when the user asks to "test a cross-repo feature", "deploy a feature branch to staging", "test SDK against OH Cloud", "e2e t
- [[csharp-testing]] — C# and .NET testing patterns with xUnit, FluentAssertions, mocking, integration tests, and test organization best practices.
- [[e2e-testing]] — Playwright E2E testing patterns, Page Object Model, configuration, CI/CD integration, artifact management, and flaky test strategies.
- [[e2e-testing-patterns]] — Master end-to-end testing with Playwright and Cypress to build reliable test suites that catch bugs, improve confidence, and enable fast deployment. U
- [[golang-testing]] — Go testing patterns including table-driven tests, subtests, benchmarks, fuzzing, and test coverage. Follows TDD methodology with idiomatic Go practice
- [[javascript-testing-patterns]] — Implement comprehensive testing strategies using Jest, Vitest, and Testing Library for unit tests, integration tests, and end-to-end testing with mock
- [[perl-testing]] — Perl testing patterns using Test2::V0, Test::More, prove runner, mocking, coverage with Devel::Cover, and TDD methodology.
- [[pr-test]] — E2E manual testing of PRs/branches using docker compose, agent-browser, and API calls. TRIGGER when user asks to manually test a PR, test a feature en
- [[python-testing]] — Python testing strategies using pytest, TDD methodology, fixtures, mocking, parametrization, and coverage requirements.
- [[python-testing-patterns]] — Implement comprehensive testing strategies with pytest, fixtures, mocking, and test-driven development. Use when writing Python tests, setting up test
- [[qa-expert]] — This skill should be used when establishing comprehensive QA testing processes for any software project. Use when creating test strategies, writing te
- [[rust-testing]] — Rust testing patterns including unit tests, integration tests, async testing, property-based testing, mocking, and coverage. Follows TDD methodology.
- [[screen-reader-testing]] — Test web applications with screen readers including VoiceOver, NVDA, and JAWS. Use when validating screen reader compatibility, debugging accessibilit
- [[swift-protocol-di-testing]] — Protocol-based dependency injection for testable Swift code — mock file system, network, and external APIs using focused protocols and Swift Testing.
- [[tdd-workflow]] — Use this skill when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with 80%+ coverage including unit, integr
- [[temporal-python-testing]] — Test Temporal workflows with pytest, time-skipping, and mocking strategies. Covers unit testing, integration testing, replay testing, and local develo
- [[test-driven-development]] — Drives development with tests. Use when implementing any logic, fixing any bug, or changing any behavior. Use when you need to prove that code works, 
- [[web3-testing]] — Test smart contracts comprehensively using Hardhat and Foundry with unit tests, integration tests, and mainnet forking. Use when testing Solidity cont
- [[webapp-testing]] — Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, ca
- [[worker-benchmarks]] — Run comprehensive worker system benchmarks and performance analysis
