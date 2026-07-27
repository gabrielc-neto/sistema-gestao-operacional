-- Frota Pontual — vencimentos de documentos
-- Gerado automaticamente. Compatível MySQL 8+ e PostgreSQL 13+.

DROP TABLE IF EXISTS frota_vencimentos_documentos;

CREATE TABLE frota_vencimentos_documentos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  categoria         VARCHAR(20)  NOT NULL,     -- motorista | veiculo | desligado
  dono              VARCHAR(120) NOT NULL,     -- nome do motorista ou placa
  tipo              VARCHAR(30)  NOT NULL,     -- CIV | CIPP | CRLV | CNH | ...
  arquivo           VARCHAR(255) NOT NULL,
  emissao           DATE         NULL,
  vencimento        DATE         NULL,
  status            VARCHAR(30)  NOT NULL,     -- vencido | ok | vencendo_30d | sem_data | ...
  dias_ate_vencer   INT          NULL,
  caminho_local     TEXT         NULL,
  extraido_via_ocr  BOOLEAN      NOT NULL DEFAULT FALSE,
  atualizado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dono (dono),
  INDEX idx_tipo (tipo),
  INDEX idx_status (status),
  INDEX idx_vencimento (vencimento)
);

-- --- INSERTs ---
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ADAM MOREIRA', 'CNH',
       'ADAM - CNH.pdf', NULL, '2027-04-27',
       'ok', 285,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ADAM MOREIRA\ADAM - CNH.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ADAM MOREIRA', 'MOPP',
       'ADAN MOPP.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ADAM MOREIRA\sem-data\ADAN MOPP.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ADAM MOREIRA', 'NR35',
       'NR 35 ADAM.pdf', NULL, '2025-09-11',
       'vencido', -308,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ADAM MOREIRA\vencidos\NR 35 ADAM.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ADAM MOREIRA', 'NR20',
       'NR20 ADAM.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ADAM MOREIRA\sem-data\NR20 ADAM.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'AGADIR MACHADO', 'CNH',
       'CNH AGADIR MACHADO.pdf', NULL, '2032-12-07',
       'ok', 2336,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\AGADIR MACHADO\CNH AGADIR MACHADO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'AGADIR MACHADO', 'MOPP',
       'MOPP AGADIR.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\AGADIR MACHADO\sem-data\MOPP AGADIR.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'AGADIR MACHADO', 'NR20',
       'NR 20 AGADIR.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\AGADIR MACHADO\sem-data\NR 20 AGADIR.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ANGELO MARCHINI NETO', 'CNH',
       'CNH angelo.pdf', NULL, '2030-10-17',
       'ok', 1554,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ANGELO MARCHINI NETO\CNH angelo.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ANGELO MARCHINI NETO', 'MOPP',
       'mopp angelo.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ANGELO MARCHINI NETO\sem-data\mopp angelo.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ANGELO MARCHINI NETO', 'NR20',
       'NR 20 ANGELO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ANGELO MARCHINI NETO\sem-data\NR 20 ANGELO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ANGELO MARCHINI NETO', 'NR35',
       'NR 35 ANGELO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ANGELO MARCHINI NETO\sem-data\NR 35 ANGELO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'CELSO LUIZ PONTAROLO', 'CNH',
       'CNH digital CELSO .pdf', NULL, '2031-08-30',
       'ok', 1871,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\CELSO LUIZ PONTAROLO\CNH digital CELSO .pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'CELSO LUIZ PONTAROLO', 'MOPP',
       'Mopp CELSO .pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\CELSO LUIZ PONTAROLO\sem-data\Mopp CELSO .pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'CELSO LUIZ PONTAROLO', 'NR20',
       'NR 20 CELSO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\CELSO LUIZ PONTAROLO\sem-data\NR 20 CELSO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'CELSO LUIZ PONTAROLO', 'NR35',
       'NR 35 CELSO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\CELSO LUIZ PONTAROLO\sem-data\NR 35 CELSO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'CLAUDINOR DE SOUZA', 'CNH',
       'CNH CLAUDINOR D SOUZA.pdf', NULL, '2034-10-24',
       'ok', 3022,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\CLAUDINOR DE SOUZA\CNH CLAUDINOR D SOUZA.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'CLAUDINOR DE SOUZA', 'MOPP',
       'MOPP CLAUDINOR DE SOUZA.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\CLAUDINOR DE SOUZA\sem-data\MOPP CLAUDINOR DE SOUZA.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'CLAUDINOR DE SOUZA', 'MOPP',
       'MOPP CLAUDINOR.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\CLAUDINOR DE SOUZA\sem-data\MOPP CLAUDINOR.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'CLAUDINOR DE SOUZA', 'NR20',
       'NR20 CLAUDINOR.pdf', NULL, '2026-02-06',
       'vencido', -160,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\CLAUDINOR DE SOUZA\vencidos\NR20 CLAUDINOR.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'CLAUDINOR DE SOUZA', 'NR35',
       'NR35 CLAUDINOR.pdf', NULL, '2025-02-12',
       'vencido', -519,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\CLAUDINOR DE SOUZA\vencidos\NR35 CLAUDINOR.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'COSME DA SILVA', 'CNH',
       'CNH-e.pdf', NULL, '2034-01-17',
       'ok', 2742,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\COSME DA SILVA\CNH-e.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'COSME DA SILVA', 'MOPP',
       'MOPP COSME.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\COSME DA SILVA\sem-data\MOPP COSME.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'COSME DA SILVA', 'NR20',
       'NR20 COSME.pdf', NULL, '2025-09-29',
       'vencido', -290,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\COSME DA SILVA\vencidos\NR20 COSME.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'COSME DA SILVA', 'NR35',
       'NR35 COSME_001.pdf', NULL, '2025-09-30',
       'vencido', -289,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\COSME DA SILVA\vencidos\NR35 COSME_001.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EDINEY ERNESTO', 'CNH',
       'CNH- EDINEY.pdf', NULL, '2033-05-17',
       'ok', 2497,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EDINEY ERNESTO\CNH- EDINEY.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EDINEY ERNESTO', 'MOPP',
       'MOPP EDINEY.pdf', NULL, '2026-02-01',
       'vencido', -164,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EDINEY ERNESTO\vencidos\MOPP EDINEY.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EDINEY ERNESTO', 'NR20',
       'NR20 EDINEY.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EDINEY ERNESTO\sem-data\NR20 EDINEY.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EDINEY ERNESTO', 'NR35',
       'NR35 EDINEY.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EDINEY ERNESTO\sem-data\NR35 EDINEY.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EDSON ROBERTO', 'CNH',
       'CNH EDSON FLAVIO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EDSON ROBERTO\sem-data\CNH EDSON FLAVIO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EDSON ROBERTO', 'MOPP',
       'MOPP EDSON (2).pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EDSON ROBERTO\sem-data\MOPP EDSON (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EDSON ROBERTO', 'MOPP',
       'MOPP EDSON.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EDSON ROBERTO\sem-data\MOPP EDSON.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ELIAZER DE OLIVEIRA', 'CNH',
       'CNH Elizaer  De Oliveira.pdf', NULL, '2030-07-26',
       'ok', 1471,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ELIAZER DE OLIVEIRA\CNH Elizaer  De Oliveira.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ELIAZER DE OLIVEIRA', 'MOPP',
       'eliazer mopp.pdf', NULL, '2029-10-29',
       'ok', 1202,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ELIAZER DE OLIVEIRA\eliazer mopp.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ELIAZER DE OLIVEIRA', 'NR20',
       'NR20 ELIAZER.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ELIAZER DE OLIVEIRA\sem-data\NR20 ELIAZER.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ELIAZER DE OLIVEIRA', 'NR35',
       'NR35 ELIAZER.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ELIAZER DE OLIVEIRA\sem-data\NR35 ELIAZER.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ELIZANDRO OLIVEIRA', 'OUTROS',
       'CNH_ELIZANDRO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ELIZANDRO OLIVEIRA\sem-data\CNH_ELIZANDRO.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ELIZANDRO OLIVEIRA', 'OUTROS',
       'MOPP_ELIZANDRO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ELIZANDRO OLIVEIRA\sem-data\MOPP_ELIZANDRO.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ELIZANDRO OLIVEIRA', 'NR20',
       'NR20 ELISANDRO.pdf', NULL, '2025-11-24',
       'vencido', -234,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ELIZANDRO OLIVEIRA\vencidos\NR20 ELISANDRO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ELIZANDRO OLIVEIRA', 'NR35',
       'NR35 ELISANDRO.pdf', NULL, '2025-11-25',
       'vencido', -233,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ELIZANDRO OLIVEIRA\vencidos\NR35 ELISANDRO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ELTON FRANKLIN DA SILVA', 'CNH',
       'CNH ELTON FRANKLIN DA SILVA.pdf', NULL, '2035-06-17',
       'ok', 3258,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ELTON FRANKLIN DA SILVA\CNH ELTON FRANKLIN DA SILVA.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ELTON FRANKLIN DA SILVA', 'CNH',
       'CNH ENTON .pdf', NULL, '2035-06-17',
       'ok', 3258,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ELTON FRANKLIN DA SILVA\CNH ENTON .pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ELTON FRANKLIN DA SILVA', 'MOPP',
       'MOPP ELTON .pdf', NULL, '2030-10-17',
       'ok', 1554,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ELTON FRANKLIN DA SILVA\MOPP ELTON .pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ELTON FRANKLIN DA SILVA', 'MOPP',
       'MOPP Elton franklin Da Silva.pdf', NULL, '2030-10-17',
       'ok', 1554,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ELTON FRANKLIN DA SILVA\MOPP Elton franklin Da Silva.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EVERSON MUNIS GADONSKI', 'CNH',
       'CNH EVERSON MUNIS GADONSKI.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EVERSON MUNIS GADONSKI\sem-data\CNH EVERSON MUNIS GADONSKI.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EVERSON MUNIS GADONSKI', 'MOPP',
       'MOPP EVERSON NUMIS.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EVERSON MUNIS GADONSKI\sem-data\MOPP EVERSON NUMIS.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EVERSON MUNIS GADONSKI', 'NR20',
       'NR20 EVERSON.pdf', NULL, '2025-02-10',
       'vencido', -521,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EVERSON MUNIS GADONSKI\vencidos\NR20 EVERSON.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EVERSON MUNIS GADONSKI', 'NR35',
       'NR35 EVERSON.pdf', NULL, '2025-02-11',
       'vencido', -520,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EVERSON MUNIS GADONSKI\vencidos\NR35 EVERSON.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EZEQUIEL RIBEIRO', 'CNH',
       'CNH-e EZEQUIEL.pdf', NULL, '2034-11-11',
       'ok', 3040,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EZEQUIEL RIBEIRO\CNH-e EZEQUIEL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EZEQUIEL RIBEIRO', 'MOPP',
       'MOPP EZEQUIEL.pdf', NULL, '2023-09-08',
       'vencido', -1042,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EZEQUIEL RIBEIRO\vencidos\MOPP EZEQUIEL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EZEQUIEL RIBEIRO', 'NR20',
       'NR 20 EZEQUIEL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EZEQUIEL RIBEIRO\sem-data\NR 20 EZEQUIEL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'EZEQUIEL RIBEIRO', 'NR35',
       'NR 35 EZEQUIEL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\EZEQUIEL RIBEIRO\sem-data\NR 35 EZEQUIEL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'FABIO MALACOSKI', 'CNH',
       'CNH FABIO.pdf', NULL, '2035-10-29',
       'ok', 3392,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\FABIO MALACOSKI\CNH FABIO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'FARLEY DANIEL MENDES ROCHA', 'CNH',
       'CNH-e.pdf', NULL, '2034-07-31',
       'ok', 2937,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\FARLEY DANIEL MENDES ROCHA\CNH-e.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'HELIO GALDINO', 'CNH',
       'CNH helio.pdf', NULL, '2029-11-27',
       'ok', 1230,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\HELIO GALDINO\CNH helio.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'HELIO GALDINO', 'MOPP',
       'MOPP HELIO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\HELIO GALDINO\sem-data\MOPP HELIO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'HELIO GALDINO', 'NR20',
       'NR 20 HELIO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\HELIO GALDINO\sem-data\NR 20 HELIO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'HELIO GALDINO', 'NR35',
       'NR 35 HELIO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\HELIO GALDINO\sem-data\NR 35 HELIO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'IDINEI FRANCA DE SOUZA', 'CNH',
       'CNH IDINEI.pdf', NULL, '2030-08-09',
       'ok', 1485,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\IDINEI FRANCA DE SOUZA\CNH IDINEI.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'IDINEI FRANCA DE SOUZA', 'MOPP',
       'MOPP IDINEI FRANÇA.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\IDINEI FRANCA DE SOUZA\sem-data\MOPP IDINEI FRANÇA.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'IDINEI FRANCA DE SOUZA', 'MOPP',
       'MOPP IDINEI.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\IDINEI FRANCA DE SOUZA\sem-data\MOPP IDINEI.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'IDINEI FRANCA DE SOUZA', 'NR35',
       'NR 35 IDINEI.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\IDINEI FRANCA DE SOUZA\sem-data\NR 35 IDINEI.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'IDINEI FRANCA DE SOUZA', 'NR20',
       'NR20 IDINEI.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\IDINEI FRANCA DE SOUZA\sem-data\NR20 IDINEI.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ISMAXON GERALDO', 'MOPP',
       'CERTIFICADO MOPP ISMAXON .pdf', NULL, '2029-02-01',
       'ok', 932,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ISMAXON GERALDO\CERTIFICADO MOPP ISMAXON .pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ISMAXON GERALDO', 'CNH',
       'CNH-e ATUALIZADA.pdf', NULL, '2033-10-10',
       'ok', 2643,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ISMAXON GERALDO\CNH-e ATUALIZADA.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ISMAXON GERALDO', 'CNH',
       'ISMAXON - CNH (002).pdf', NULL, '2033-10-10',
       'ok', 2643,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ISMAXON GERALDO\ISMAXON - CNH (002).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'JULIO ALCIONE GONÇALVES', 'CNH',
       'CNH JULIO ALCIONEI.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\JULIO ALCIONE GONÇALVES\sem-data\CNH JULIO ALCIONEI.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'JULIO ALCIONE GONÇALVES', 'MOPP',
       'MOPP JULIO ALCIONEI (2).pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\JULIO ALCIONE GONÇALVES\sem-data\MOPP JULIO ALCIONEI (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'JULIO ALCIONE GONÇALVES', 'NR35',
       'NR 35 JULIO.pdf', NULL, '2026-02-10',
       'vencido', -156,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\JULIO ALCIONE GONÇALVES\vencidos\NR 35 JULIO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'JULIO ALCIONE GONÇALVES', 'NR20',
       'NR20 JULIO.pdf', NULL, '2026-02-09',
       'vencido', -157,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\JULIO ALCIONE GONÇALVES\vencidos\NR20 JULIO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LAURECI FERREIRA SOARES', 'CNH',
       'CNH LAURECI SOARES.pdf', NULL, '2024-07-10',
       'vencido', -736,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LAURECI FERREIRA SOARES\vencidos\CNH LAURECI SOARES.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LAURECI FERREIRA SOARES', 'NR20',
       'NR20 LAURECI.pdf', NULL, '2025-02-10',
       'vencido', -521,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LAURECI FERREIRA SOARES\vencidos\NR20 LAURECI.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LAURECI FERREIRA SOARES', 'NR35',
       'NR35 LAURECI.pdf', NULL, '2025-02-11',
       'vencido', -520,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LAURECI FERREIRA SOARES\vencidos\NR35 LAURECI.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LEONARDO DE OLIVEIRA LIMA', 'CNH',
       'CNH   LEONARDO DE OLIVEIRA LIMA.pdf', NULL, '2021-03-30',
       'vencido', -1934,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LEONARDO DE OLIVEIRA LIMA\vencidos\CNH   LEONARDO DE OLIVEIRA LIMA.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LEONARDO DE OLIVEIRA LIMA', 'CNH',
       'CNH-e.pdf leonardo .pdf', NULL, '2021-03-30',
       'vencido', -1934,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LEONARDO DE OLIVEIRA LIMA\vencidos\CNH-e.pdf leonardo .pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LEONARDO DE OLIVEIRA LIMA', 'MOPP',
       'MOPP - LEONARDO DE OLIVEIRA LIMA.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LEONARDO DE OLIVEIRA LIMA\sem-data\MOPP - LEONARDO DE OLIVEIRA LIMA.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LORINALDO SILVA', 'CNH',
       'CNH LORINALDO.pdf', NULL, '2035-04-25',
       'ok', 3205,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LORINALDO SILVA\CNH LORINALDO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LORINALDO SILVA', 'CNH',
       'CNH.pdf', NULL, '2035-04-25',
       'ok', 3205,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LORINALDO SILVA\CNH.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LORINALDO SILVA', 'MOPP',
       'MOPP.pdf', NULL, '2025-05-07',
       'vencido', -434,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LORINALDO SILVA\vencidos\MOPP.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LUCIO SCHUARTZ', 'CNH',
       'CNH LÚCIO.pdf', NULL, '2028-09-12',
       'ok', 789,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LUCIO SCHUARTZ\CNH LÚCIO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LUCIO SCHUARTZ', 'MOPP',
       'MOPP LUCIO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LUCIO SCHUARTZ\sem-data\MOPP LUCIO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LUIS FERNANDO R. DE LIMA', 'CNH',
       'CNH -  LUIS FERNANDO RAMALHO DE LIMA .pdf', NULL, '2035-06-12',
       'ok', 3253,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LUIS FERNANDO R. DE LIMA\CNH -  LUIS FERNANDO RAMALHO DE LIMA .pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LUIS FERNANDO R. DE LIMA', 'MOPP',
       'mopp luis .pdf', NULL, '2025-11-02',
       'vencido', -255,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LUIS FERNANDO R. DE LIMA\vencidos\mopp luis .pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LUIS FERNANDO R. DE LIMA', 'NR20',
       'NR20 LUIS.pdf', NULL, '2025-05-19',
       'vencido', -423,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LUIS FERNANDO R. DE LIMA\vencidos\NR20 LUIS.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'LUIS FERNANDO R. DE LIMA', 'NR35',
       'NR35 LUIS.pdf', NULL, '2025-05-20',
       'vencido', -422,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\LUIS FERNANDO R. DE LIMA\vencidos\NR35 LUIS.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'MAIGER LOURENÇO COSTA', 'CNH',
       'Cnh maiger  .pdf', NULL, '2035-01-22',
       'ok', 3112,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\MAIGER LOURENÇO COSTA\Cnh maiger  .pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'MAIGER LOURENÇO COSTA', 'CNH',
       'CNH MAIGER.pdf', NULL, '2035-01-22',
       'ok', 3112,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\MAIGER LOURENÇO COSTA\CNH MAIGER.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'MAIGER LOURENÇO COSTA', 'CNH',
       'CNH-e.pdf', NULL, '2024-11-29',
       'vencido', -594,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\MAIGER LOURENÇO COSTA\vencidos\CNH-e.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'MAIGER LOURENÇO COSTA', 'MOPP',
       'MOPP MAIGER.pdf', NULL, '2022-04-29',
       'vencido', -1539,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\MAIGER LOURENÇO COSTA\vencidos\MOPP MAIGER.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'MARCIO ALBERTO MACHADO', 'CNH',
       'CNH-e MARCIO.pdf', NULL, '2030-07-21',
       'ok', 1466,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\MARCIO ALBERTO MACHADO\CNH-e MARCIO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'MARCIO ALBERTO MACHADO', 'MOPP',
       'MOPP MARCIO MACHADO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\MARCIO ALBERTO MACHADO\sem-data\MOPP MARCIO MACHADO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'MARCIO ALBERTO MACHADO', 'MOPP',
       'mopp.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\MARCIO ALBERTO MACHADO\sem-data\mopp.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'MARCIO ALBERTO MACHADO', 'NR20',
       'NR20 MARCIO ALBERTO.pdf', NULL, '2025-02-10',
       'vencido', -521,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\MARCIO ALBERTO MACHADO\vencidos\NR20 MARCIO ALBERTO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'MARCIO ALBERTO MACHADO', 'NR35',
       'NR35 MARCIO ALBERTO.pdf', NULL, '2025-02-11',
       'vencido', -520,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\MARCIO ALBERTO MACHADO\vencidos\NR35 MARCIO ALBERTO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'MAURO SANTOS', 'CNH',
       'CNH MAURO SANTOS .pdf', NULL, '2030-08-27',
       'ok', 1503,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\MAURO SANTOS\CNH MAURO SANTOS .pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'MAURO SANTOS', 'CNH',
       'CNH MAURO SANTOS.pdf', NULL, '2025-10-11',
       'vencido', -278,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\MAURO SANTOS\vencidos\CNH MAURO SANTOS.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'MAURO SANTOS', 'MOPP',
       'MOPP MAURO SANTOS.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\MAURO SANTOS\sem-data\MOPP MAURO SANTOS.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ODAIR VIEIRA', 'CNH',
       'CNH ODAIR JOSE VIEIRA.pdf', NULL, '2033-03-20',
       'ok', 2439,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ODAIR VIEIRA\CNH ODAIR JOSE VIEIRA.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ODAIR VIEIRA', 'MOPP',
       'MOPP ODAIR JOSE VIEIRA.pdf', NULL, '2030-01-23',
       'ok', 1288,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ODAIR VIEIRA\MOPP ODAIR JOSE VIEIRA.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ODAIR VIEIRA', 'NR20',
       'NR20 ODAIR.pdf', NULL, '2025-01-06',
       'vencido', -556,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ODAIR VIEIRA\vencidos\NR20 ODAIR.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ODAIR VIEIRA', 'NR35',
       'NR35 ODAIR.pdf', NULL, '2024-07-03',
       'vencido', -743,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ODAIR VIEIRA\vencidos\NR35 ODAIR.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'REGINALDO AQUINO', 'CNH',
       'CNH REGINALDO.pdf', NULL, '2031-05-25',
       'ok', 1774,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\REGINALDO AQUINO\CNH REGINALDO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'REGINALDO AQUINO', 'MOPP',
       'MOPP REGINALDO AQUINO.pdf', NULL, '2022-02-10',
       'vencido', -1617,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\REGINALDO AQUINO\vencidos\MOPP REGINALDO AQUINO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'REGINALDO AQUINO', 'NR20',
       'NR20 REGINALDO.pdf', NULL, '2025-06-18',
       'vencido', -393,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\REGINALDO AQUINO\vencidos\NR20 REGINALDO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'REGINALDO AQUINO', 'NR35',
       'NR35 REGINALDO_001.pdf', NULL, '2025-06-20',
       'vencido', -391,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\REGINALDO AQUINO\vencidos\NR35 REGINALDO_001.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ROGERIO SILVA', 'CNH',
       'CNH ROGERIO SILVA.pdf', NULL, '2030-09-24',
       'ok', 1531,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ROGERIO SILVA\CNH ROGERIO SILVA.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ROGERIO SILVA', 'CNH',
       'CNH-e.pdf.pdf', NULL, '2030-09-24',
       'ok', 1531,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ROGERIO SILVA\CNH-e.pdf.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'ROGERIO SILVA', 'MOPP',
       'MOPP ROGERIO.pdf', NULL, '2024-10-21',
       'vencido', -633,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\ROGERIO SILVA\vencidos\MOPP ROGERIO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'RONALDO SANTOS', 'CNH',
       'CNH RONALDO SANTOS.pdf', NULL, '2032-07-25',
       'ok', 2201,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\RONALDO SANTOS\CNH RONALDO SANTOS.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'RONALDO SANTOS', 'MOPP',
       'MOPP RONALDO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\RONALDO SANTOS\sem-data\MOPP RONALDO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'VALDECIR ZORECK', 'CNH',
       'CNH VALDECIR.pdf', NULL, '2031-10-21',
       'ok', 1923,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\VALDECIR ZORECK\CNH VALDECIR.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'VALDECIR ZORECK', 'MOPP',
       'MOPP VALDECIR.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\VALDECIR ZORECK\sem-data\MOPP VALDECIR.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'VALDEREI ALELUIA', 'CNH',
       'CNH - VALDEREI .pdf', NULL, '2026-04-07',
       'vencido', -100,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\VALDEREI ALELUIA\vencidos\CNH - VALDEREI .pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'VALDEREI ALELUIA', 'MOPP',
       'MOPP VALDEREI.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\VALDEREI ALELUIA\sem-data\MOPP VALDEREI.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'VALDINEI DO CARMO ANDRADE', 'CNH',
       'CNH VALDINEI DO CARMO DE ANDRADE.pdf', NULL, '2022-08-03',
       'vencido', -1443,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\VALDINEI DO CARMO ANDRADE\vencidos\CNH VALDINEI DO CARMO DE ANDRADE.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'VALDINEI DO CARMO ANDRADE', 'MOPP',
       'MOPP VALDINEI DO CARMO DE ANDRADE.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\VALDINEI DO CARMO ANDRADE\sem-data\MOPP VALDINEI DO CARMO DE ANDRADE.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'VALDINEI DO CARMO ANDRADE', 'NR20',
       'NR20 VALDINEI.pdf', NULL, '2024-08-15',
       'vencido', -700,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\VALDINEI DO CARMO ANDRADE\vencidos\NR20 VALDINEI.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'VALDINEI DO CARMO ANDRADE', 'NR35',
       'NR35 VALDINEI.pdf', NULL, '2024-08-16',
       'vencido', -699,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\VALDINEI DO CARMO ANDRADE\vencidos\NR35 VALDINEI.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'VANDERLEI TEIXEIRA', 'CNH',
       'CNH VANDERLEI TEIXEIRA.pdf', NULL, '2032-12-21',
       'ok', 2350,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\VANDERLEI TEIXEIRA\CNH VANDERLEI TEIXEIRA.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'VANDERLEI TEIXEIRA', 'MOPP',
       'MOPP VANDERLEI TEIXEIRA.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\VANDERLEI TEIXEIRA\sem-data\MOPP VANDERLEI TEIXEIRA.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'VANDERLEI TEIXEIRA', 'NR20',
       'NR20 VANDERLEI.pdf', NULL, '2025-02-10',
       'vencido', -521,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\VANDERLEI TEIXEIRA\vencidos\NR20 VANDERLEI.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'VANDERLEI TEIXEIRA', 'NR35',
       'NR35 VANDERLEI.pdf', NULL, '2025-02-11',
       'vencido', -520,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\VANDERLEI TEIXEIRA\vencidos\NR35 VANDERLEI.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'VANDERSON LUIZ SOARES', 'MOPP',
       'MOPP VANDERSON.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\VANDERSON LUIZ SOARES\sem-data\MOPP VANDERSON.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'VANDERSON LUIZ SOARES', 'NR20',
       'NR20 VANDERSON (1).pdf', NULL, '2025-02-12',
       'vencido', -519,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\VANDERSON LUIZ SOARES\vencidos\NR20 VANDERSON (1).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'WEBERSON PELIGRINI', 'CNH',
       'CNH WEBERSON.pdf', NULL, '2028-06-25',
       'ok', 710,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\WEBERSON PELIGRINI\CNH WEBERSON.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('motoristas', 'WEBERSON PELIGRINI', 'MOPP',
       'MOPP WEBERSON (2).pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Motoristas\WEBERSON PELIGRINI\sem-data\MOPP WEBERSON (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AES9364', 'CRLV',
       'CRLV AES9364.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AES9364\sem-data\CRLV AES9364.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKC4899', 'IPEM',
       'AFERIÇÃO AKC4899 (2).pdf', NULL, '2026-08-06',
       'vencendo_30d', 21,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKC4899\AFERIÇÃO AKC4899 (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKC4899', 'CIPP',
       'CIPP AKC-4899.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKC4899\sem-data\CIPP AKC-4899.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKC4899', 'CIPP',
       'CIPP AKC-4899_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKC4899\sem-data\CIPP AKC-4899_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKC4899', 'CIV',
       'CIV AKC-4899.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKC4899\sem-data\CIV AKC-4899.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKC4899', 'CIV',
       'CIV AKC-4899_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKC4899\sem-data\CIV AKC-4899_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKC4899', 'CRLV',
       'CRLV_akc4899 2025.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKC4899\sem-data\CRLV_akc4899 2025.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKC4899', 'CRLV',
       'CRLV_akc4899.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKC4899\sem-data\CRLV_akc4899.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKD5988', 'IPEM',
       'AFERIÇÃO AKC4906.pdf', NULL, '2026-06-14',
       'vencido', -32,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKD5988\vencidos\AFERIÇÃO AKC4906.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKD5988', 'CIPP',
       'CIPP AKC-4906.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKD5988\sem-data\CIPP AKC-4906.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKD5988', 'CIV',
       'CIV AKD5988 (4).pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKD5988\sem-data\CIV AKD5988 (4).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKD5988', 'CIV',
       'CIV-AKC-4906-PONTUAL.pdf', NULL, '2020-03-17',
       'vencido', -2312,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKD5988\vencidos\CIV-AKC-4906-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKD5988', 'CRLV',
       'CRLV AKD5988.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKD5988\sem-data\CRLV AKD5988.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKD5988', 'CRLV',
       'CRLV_AKC4906.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKD5988\sem-data\CRLV_AKC4906.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKD5A88', 'IPEM',
       'AFERIÇÃO AKC-4911.pdf', NULL, '2027-02-24',
       'ok', 223,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKD5A88\AFERIÇÃO AKC-4911.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKD5A88', 'CIPP',
       'CIPP AKC4911.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKD5A88\sem-data\CIPP AKC4911.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKD5A88', 'CIV',
       'CIV AKC-4911.pdf', NULL, '2026-03-02',
       'vencido', -136,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKD5A88\vencidos\CIV AKC-4911.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKD5A88', 'CIV',
       'CIV AKD5A88.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKD5A88\sem-data\CIV AKD5A88.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKD5A88', 'CRLV',
       'CRLV AKC4911.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKD5A88\sem-data\CRLV AKC4911.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'AKD5A88', 'CRLV',
       'CRLV AKD5A88.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\AKD5A88\sem-data\CRLV AKD5A88.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'IPEM',
       'AFERIÇÃO AQR-9374.pdf', NULL, '2026-12-03',
       'ok', 140,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\AFERIÇÃO AQR-9374.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'IPEM',
       'AFERIÇÃO AQR-9787.pdf', NULL, '2026-12-03',
       'ok', 140,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\AFERIÇÃO AQR-9787.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'CIPP',
       'CIPP AQR-9374.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\sem-data\CIPP AQR-9374.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'CIPP',
       'CIPP AQR-9387.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\sem-data\CIPP AQR-9387.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'CIV',
       'CIV AQR-9374.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\sem-data\CIV AQR-9374.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'CIV',
       'CIV AQR-9387.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\sem-data\CIV AQR-9387.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'CIV',
       'CIV-BBE-9588-vec-25-03-2027 .pdf', NULL, '2026-03-25',
       'vencido', -113,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\vencidos\CIV-BBE-9588-vec-25-03-2027 .pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'CRLV',
       'CLRV AQR-9374.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\sem-data\CLRV AQR-9374.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'CRLV',
       'CLRV AQR-9387.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\sem-data\CLRV AQR-9387.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'OUTROS',
       'comprovante endereco COSME.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\sem-data\comprovante endereco COSME.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'CRLV',
       'CRLV_BBE-9588.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\sem-data\CRLV_BBE-9588.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'OUTROS',
       'PONTUAL BBE9588_FEDERAL.pdf', NULL, '2025-12-11',
       'vencido', -216,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\vencidos\PONTUAL BBE9588_FEDERAL.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'OUTROS',
       'PONTUAL BRASIL BBE-9588  licença SP .pdf', NULL, '2024-07-12',
       'vencido', -733,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\vencidos\PONTUAL BRASIL BBE-9588  licença SP .pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'OUTROS',
       'PONTUAL BRASIL BBE9588_FEDERAL.pdf', NULL, '2027-01-18',
       'ok', 187,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\PONTUAL BRASIL BBE9588_FEDERAL.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9588', 'OUTROS',
       'PONTUAL BRASIL BBE9588_PARANA.pdf', NULL, '2025-07-14',
       'vencido', -366,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9588\vencidos\PONTUAL BRASIL BBE9588_PARANA.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'IPEM',
       'aferição AMX5187 (3).pdf', NULL, '2027-07-04',
       'ok', 353,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\aferição AMX5187 (3).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'IPEM',
       'aferição AMX5192 (3).pdf', NULL, '2027-07-04',
       'ok', 353,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\aferição AMX5192 (3).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'CIPP',
       'CIPP-A655291-AMX-5192-PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\sem-data\CIPP-A655291-AMX-5192-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'CIPP',
       'CIPP-A655292-AMX5187-PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\sem-data\CIPP-A655292-AMX5187-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'CIV',
       'CIV BBE-9593.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\sem-data\CIV BBE-9593.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'CIV',
       'CIV-AMX-5187-PONTUAL.pdf', NULL, '2026-03-09',
       'vencido', -129,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\vencidos\CIV-AMX-5187-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'CIV',
       'CIV-AMX-5192-PONTUAL.pdf', NULL, '2026-03-09',
       'vencido', -129,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\vencidos\CIV-AMX-5192-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'OUTROS',
       'COMPROVANTE ENDEREÇO REGINALDO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\sem-data\COMPROVANTE ENDEREÇO REGINALDO.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'CRLV',
       'CRLV AMX5187.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\sem-data\CRLV AMX5187.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'CRLV',
       'CRLV AMX5192.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\sem-data\CRLV AMX5192.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'CRLV',
       'CRLV_BBE-9593.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\sem-data\CRLV_BBE-9593.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'OUTROS',
       'PONTUAL BBE9593_PARANA.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\sem-data\PONTUAL BBE9593_PARANA.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'LICENCA_DER',
       'PONTUAL BRASIL BBE-9593 LICENÇA DER SÃO PAULO .pdf', NULL, '2024-07-04',
       'vencido', -741,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\vencidos\PONTUAL BRASIL BBE-9593 LICENÇA DER SÃO PAULO .pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'OUTROS',
       'PONTUAL BRASIL BBE-9593 LICENÇA DNIT PARANA.pdf', NULL, '2025-10-06',
       'vencido', -282,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\vencidos\PONTUAL BRASIL BBE-9593 LICENÇA DNIT PARANA.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'CIPP',
       'PONTUAL CIPP AMX5187_2026.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\sem-data\PONTUAL CIPP AMX5187_2026.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9593', 'CIPP',
       'PONTUAL CIPP AMX5192_2026.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9593\sem-data\PONTUAL CIPP AMX5192_2026.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9594', 'CIV',
       'CIV BBE9594 (2).pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9594\sem-data\CIV BBE9594 (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9594', 'CRLV',
       'CRLV CPI3A61 PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9594\sem-data\CRLV CPI3A61 PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9594', 'CRLV',
       'CRLV CPI3A61 RECIBO DIGITAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9594\sem-data\CRLV CPI3A61 RECIBO DIGITAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9594', 'CRLV',
       'CRLV CPI3A62 PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9594\sem-data\CRLV CPI3A62 PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9594', 'CRLV',
       'CRLV_BBE-9594.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9594\sem-data\CRLV_BBE-9594.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9594', 'OUTROS',
       'PONTUAL BBE9588_FEDERAL.pdf', NULL, '2025-12-11',
       'vencido', -216,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9594\vencidos\PONTUAL BBE9588_FEDERAL.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9594', 'OUTROS',
       'PONTUAL BRASIL BBE-9588  licença SP .pdf', NULL, '2024-07-12',
       'vencido', -733,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9594\vencidos\PONTUAL BRASIL BBE-9588  licença SP .pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'BBE9594', 'OUTROS',
       'PONTUAL_BBE9588_PARANA[2].pdf', NULL, '2025-12-16',
       'vencido', -211,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\BBE9594\vencidos\PONTUAL_BBE9588_PARANA[2].pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H24', 'CIV',
       'CIV SEF-1H24.pdf', NULL, '2026-01-20',
       'vencido', -177,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H24\vencidos\CIV SEF-1H24.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H24', 'CRLV',
       'CRLV SEF-1H24.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H24\sem-data\CRLV SEF-1H24.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H24', 'CRLV',
       'CRLV_AXG6112.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H24\sem-data\CRLV_AXG6112.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H25', 'CIV',
       'CIV SEF1H25 (2).pdf', NULL, '2026-02-02',
       'vencido', -164,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H25\vencidos\CIV SEF1H25 (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H25', 'CRLV',
       'CRLV_BBF2246.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H25\sem-data\CRLV_BBF2246.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H25', 'CRLV',
       'CRLV_SEF1H25.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H25\sem-data\CRLV_SEF1H25.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H25', 'OUTROS',
       'ENDERECO EZEQUIEL .pdf', NULL, '2026-03-11',
       'vencido', -126,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H25\vencidos\ENDERECO EZEQUIEL .pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H27', 'IPEM',
       'AFERIÇÃO AYC4942.pdf', '2026-03-13', '2028-03-12',
       'ok', 606,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H27\AFERIÇÃO AYC4942.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H27', 'CIPP',
       'CIPP AYC-4942.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H27\sem-data\CIPP AYC-4942.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H27', 'CIV',
       'CIV AYC-4942.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H27\sem-data\CIV AYC-4942.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H27', 'CIV',
       'CIV SEF-1H27.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H27\sem-data\CIV SEF-1H27.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H27', 'OUTROS',
       'COMPROVANTE RESIDENCIA MAURO SANTODS.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H27\sem-data\COMPROVANTE RESIDENCIA MAURO SANTODS.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H27', 'CRLV',
       'CRLV AYC-4942.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H27\sem-data\CRLV AYC-4942.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H27', 'CRLV',
       'CRLV_SEF1H27.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H27\sem-data\CRLV_SEF1H27.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H28', 'IPEM',
       'AFERIÇÃO ATR6572.pdf', '2025-09-09', '2027-07-16',
       'ok', 366,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H28\AFERIÇÃO ATR6572.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H28', 'CIPP',
       'CIPP ATR6572.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H28\sem-data\CIPP ATR6572.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H28', 'CIV',
       'CIV ATR6572.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H28\sem-data\CIV ATR6572.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H28', 'CIV',
       'CIV SEF1H28 (3).pdf', NULL, '2026-01-12',
       'vencido', -185,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H28\vencidos\CIV SEF1H28 (3).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H28', 'OUTROS',
       'Comprovante endereço CELSO .pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H28\sem-data\Comprovante endereço CELSO .pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H28', 'CRLV',
       'CRLV AVS9H13.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H28\sem-data\CRLV AVS9H13.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H28', 'CRLV',
       'CRLV_ATR6572.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H28\sem-data\CRLV_ATR6572.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H28', 'CRLV',
       'CRLV_SEF-1H28.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H28\sem-data\CRLV_SEF-1H28.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H28', 'OUTROS',
       'PONTUAL BRASIL SEF1H28_PARANA[1].pdf', NULL, '2025-07-14',
       'vencido', -366,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H28\vencidos\PONTUAL BRASIL SEF1H28_PARANA[1].pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H29', 'IPEM',
       'AFERIÇÃO ASI-3363-2026.pdf', '2026-03-09', '2028-03-03',
       'ok', 597,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H29\AFERIÇÃO ASI-3363-2026.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H29', 'CIPP',
       'CIPP ASI3363 (4).pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H29\sem-data\CIPP ASI3363 (4).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H29', 'CIV',
       'CIV ASI3363 (5).pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H29\sem-data\CIV ASI3363 (5).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H29', 'CIV',
       'CIV SEF-1H29.pdf', NULL, '2026-01-13',
       'vencido', -184,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H29\vencidos\CIV SEF-1H29.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H29', 'OUTROS',
       'COMPROVANTE DE ENDEREÇO ISMAXON.pdf', '2025-11-03', '2025-12-16',
       'vencido', -211,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H29\vencidos\COMPROVANTE DE ENDEREÇO ISMAXON.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H29', 'CRLV',
       'CRLV ASI-3363.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H29\sem-data\CRLV ASI-3363.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H29', 'CRLV',
       'CRLV_SEF1H29.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H29\sem-data\CRLV_SEF1H29.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H29', 'OUTROS',
       'ISMAXON - ENDEREÇO.pdf', '2025-09-01', '2025-10-16',
       'vencido', -272,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H29\vencidos\ISMAXON - ENDEREÇO.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H31', 'IPEM',
       'AFERIÇÃO AVS-9H13.pdf', NULL, '2026-08-06',
       'vencendo_30d', 21,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H31\AFERIÇÃO AVS-9H13.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H31', 'CIPP',
       'CIPP-AVS9H13-PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H31\sem-data\CIPP-AVS9H13-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H31', 'CIV',
       'CIV SEF1H31 (2).pdf', NULL, '2026-01-19',
       'vencido', -178,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H31\vencidos\CIV SEF1H31 (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H31', 'CIV',
       'CIV-AVS9H13-PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H31\sem-data\CIV-AVS9H13-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H31', 'CRLV',
       'CRLV_AVS9H13.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H31\sem-data\CRLV_AVS9H13.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H31', 'CRLV',
       'CRLV_SEF1H31.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H31\sem-data\CRLV_SEF1H31.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H31', 'OUTROS',
       'ENDERECO HELIO.pdf', NULL, '2026-01-15',
       'vencido', -181,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H31\vencidos\ENDERECO HELIO.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H32', 'IPEM',
       'AFERIÇÃO  AKC4903.pdf', NULL, '2026-08-07',
       'vencendo_30d', 22,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H32\AFERIÇÃO  AKC4903.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H32', 'CIPP',
       'CIPP AKC4903.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H32\sem-data\CIPP AKC4903.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H32', 'CIV',
       'CIV AKC4903.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H32\sem-data\CIV AKC4903.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H32', 'CIV',
       'CIV SEF1H32 (2).pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H32\sem-data\CIV SEF1H32 (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H32', 'CRLV',
       'CRLV  AKC4903.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H32\sem-data\CRLV  AKC4903.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H32', 'CRLV',
       'CRLV_SEF1H32.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H32\sem-data\CRLV_SEF1H32.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H32', 'OUTROS',
       'residencia angelo.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H32\sem-data\residencia angelo.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H36', 'IPEM',
       'AFERIÇÃO TBB3E69.pdf', NULL, '2027-02-12',
       'ok', 211,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H36\AFERIÇÃO TBB3E69.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H36', 'CIPP',
       'CIPP TBB3E69-PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H36\sem-data\CIPP TBB3E69-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H36', 'CIV',
       'CIV SEF-1H36 (2).pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H36\sem-data\CIV SEF-1H36 (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H36', 'CIV',
       'CIV TBB3E69-PONTUAL.pdf', NULL, '2026-02-10',
       'vencido', -156,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H36\vencidos\CIV TBB3E69-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H36', 'CRLV',
       'CRLV TBB3E69.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H36\sem-data\CRLV TBB3E69.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H36', 'CRLV',
       'CRLV_SEF1H36.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H36\sem-data\CRLV_SEF1H36.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H36', 'OUTROS',
       'endereco.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H36\sem-data\endereco.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H37', 'IPEM',
       'AFERIÇÃO AWA-6090.pdf', NULL, '2026-08-07',
       'vencendo_30d', 22,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H37\AFERIÇÃO AWA-6090.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H37', 'CIPP',
       'CIPP-AWA-6090-PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H37\sem-data\CIPP-AWA-6090-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H37', 'CIV',
       'CIV SEF-1H37_001.pdf', NULL, '2026-01-13',
       'vencido', -184,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H37\vencidos\CIV SEF-1H37_001.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H37', 'CIV',
       'CIV-AWA-6090-PONTUAL.pdf', NULL, '2026-03-09',
       'vencido', -129,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H37\vencidos\CIV-AWA-6090-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H37', 'OUTROS',
       'COMPROVANTE DE ENTEDEÇO ADAN.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H37\sem-data\COMPROVANTE DE ENTEDEÇO ADAN.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H37', 'CRLV',
       'CRLV_AWA6090.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H37\sem-data\CRLV_AWA6090.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H37', 'CRLV',
       'CRLV_SEF1H37.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H37\sem-data\CRLV_SEF1H37.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H39', 'IPEM',
       'AFERIÇÃO AWA6093 (2).pdf', NULL, '2026-08-06',
       'vencendo_30d', 21,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H39\AFERIÇÃO AWA6093 (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H39', 'CIPP',
       'CIPP AWA-6093_20260205_0001.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H39\sem-data\CIPP AWA-6093_20260205_0001.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H39', 'CIV',
       'CIV AWA-6093_20260205_0001.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H39\sem-data\CIV AWA-6093_20260205_0001.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H39', 'CIV',
       'CIV SEF-1H39.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H39\sem-data\CIV SEF-1H39.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H39', 'CRLV',
       'CRLV_AWA6093.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H39\sem-data\CRLV_AWA6093.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H39', 'CRLV',
       'CRLV_SEF1H39.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H39\sem-data\CRLV_SEF1H39.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SEF1H39', 'OUTROS',
       'NR01-09 EDINEY.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SEF1H39\sem-data\NR01-09 EDINEY.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I46', 'IPEM',
       'AFERIÇÃO TBE6C64 - OK.pdf', NULL, '2027-03-18',
       'ok', 245,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I46\AFERIÇÃO TBE6C64 - OK.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I46', 'CIPP',
       'CIPP TBE6C64 - OK.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I46\sem-data\CIPP TBE6C64 - OK.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I46', 'CIV',
       'CIV SES-9I46 - OK.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I46\sem-data\CIV SES-9I46 - OK.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I46', 'CIV',
       'CIV TBE6C64 -OK.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I46\sem-data\CIV TBE6C64 -OK.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I46', 'OUTROS',
       'Comprovante Residencia Ronaldo.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I46\sem-data\Comprovante Residencia Ronaldo.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I46', 'CRLV',
       'CRLV TBE6C64 - OK.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I46\sem-data\CRLV TBE6C64 - OK.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I46', 'CRLV',
       'CRLV_SES- 9I46 - OK.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I46\sem-data\CRLV_SES- 9I46 - OK.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I57', 'IPEM',
       'AFERIÇÃO AMX5193 (3).pdf', NULL, '2027-07-09',
       'ok', 358,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I57\AFERIÇÃO AMX5193 (3).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I57', 'IPEM',
       'AFERIÇÃO AMX5199 (3).pdf', NULL, '2027-07-09',
       'ok', 358,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I57\AFERIÇÃO AMX5199 (3).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I57', 'CIPP',
       'CIPP AMX-5193.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I57\sem-data\CIPP AMX-5193.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I57', 'CIPP',
       'CIPP AMX-5199.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I57\sem-data\CIPP AMX-5199.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I57', 'CIV',
       'CIV SES9I57.pdf', NULL, '2025-09-11',
       'vencido', -308,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I57\vencidos\CIV SES9I57.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I57', 'OUTROS',
       'COMPROVANTE DE ENDEREÇO LORINALDO.pdf', '2025-11-17', '2025-12-18',
       'vencido', -209,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I57\vencidos\COMPROVANTE DE ENDEREÇO LORINALDO.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I57', 'CRLV',
       'CRLV_AMX5193.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I57\sem-data\CRLV_AMX5193.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I57', 'CRLV',
       'CRLV_AMX5199.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I57\sem-data\CRLV_AMX5199.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I57', 'CRLV',
       'CRLV_SES-9I57.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I57\sem-data\CRLV_SES-9I57.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I57', 'NF_NORDICA',
       'NORDICA 367488.pdf', '2024-04-26', '2025-04-26',
       'vencido', -445,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I57\vencidos\NORDICA 367488.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I76', 'IPEM',
       'AFERIÇÃO TBE6C67.pdf', NULL, '2027-03-18',
       'ok', 245,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I76\AFERIÇÃO TBE6C67.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I76', 'CIPP',
       'CIPP TBE6C67.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I76\sem-data\CIPP TBE6C67.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I76', 'CIV',
       'CIV SES-9I76.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I76\sem-data\CIV SES-9I76.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I76', 'CRLV',
       'CRLV TBE6C67.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I76\sem-data\CRLV TBE6C67.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I76', 'CRLV',
       'CRLV_SES-9I76.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I76\sem-data\CRLV_SES-9I76.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I77', 'IPEM',
       'AFERIÇÃO TBE1H61.pdf', NULL, '2027-03-13',
       'ok', 240,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I77\AFERIÇÃO TBE1H61.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I77', 'CIPP',
       'CIPP TBE1H61.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I77\sem-data\CIPP TBE1H61.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I77', 'CIV',
       'CIV SES9I77.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I77\sem-data\CIV SES9I77.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I77', 'CIV',
       'CIV TBE1H61.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I77\sem-data\CIV TBE1H61.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I77', 'OUTROS',
       'COMP. ENDERECO CLAUDINOR--051.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I77\sem-data\COMP. ENDERECO CLAUDINOR--051.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I77', 'CRLV',
       'CRLV TBE1H61.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I77\sem-data\CRLV TBE1H61.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I77', 'CRLV',
       'CRLV_SES-9I77.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I77\sem-data\CRLV_SES-9I77.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I77', 'OUTROS',
       'CTPP TBE1H61.pdf', NULL, '2026-01-12',
       'vencido', -184,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I77\vencidos\CTPP TBE1H61.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I82', 'IPEM',
       'AFERIÇÃO AMX5181.pdf', NULL, '2026-08-07',
       'vencendo_30d', 22,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I82\AFERIÇÃO AMX5181.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I82', 'IPEM',
       'AFERIÇÃO AMX5183.pdf', NULL, '2026-08-07',
       'vencendo_30d', 22,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I82\AFERIÇÃO AMX5183.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I82', 'CIPP',
       'CIPP AMX-5181.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I82\sem-data\CIPP AMX-5181.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I82', 'CIPP',
       'CIPP AMX-5183.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I82\sem-data\CIPP AMX-5183.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I82', 'CIV',
       'CIV AMX5181_2026.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I82\sem-data\CIV AMX5181_2026.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I82', 'CIV',
       'CIV AMX5183_2026.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I82\sem-data\CIV AMX5183_2026.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I82', 'CIV',
       'CIV SES9I82 (2).pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I82\sem-data\CIV SES9I82 (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I82', 'CRLV',
       'CRLV_AMX5181.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I82\sem-data\CRLV_AMX5181.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I82', 'CRLV',
       'CRLV_AMX5183.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I82\sem-data\CRLV_AMX5183.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I82', 'CRLV',
       'CRLV_SES-9I82.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I82\sem-data\CRLV_SES-9I82.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I82', 'OUTROS',
       'endereco rogerio.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I82\sem-data\endereco rogerio.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I82', 'OUTROS',
       'PONTUAL BRASIL SES9I82_PARANA[1].pdf', NULL, '2025-07-14',
       'vencido', -366,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I82\vencidos\PONTUAL BRASIL SES9I82_PARANA[1].pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I83', 'IPEM',
       'AFERIÇÃO ASI-3362 -2026.pdf', '2026-03-09', '2028-03-05',
       'ok', 599,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I83\AFERIÇÃO ASI-3362 -2026.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I83', 'CIPP',
       'CIPP ASI3362.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I83\sem-data\CIPP ASI3362.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I83', 'CIV',
       'CIV ASI3362.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I83\sem-data\CIV ASI3362.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I83', 'CIV',
       'CIV SES9I83.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I83\sem-data\CIV SES9I83.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I83', 'CRLV',
       'CLRV ASI3362.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I83\sem-data\CLRV ASI3362.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I83', 'OUTROS',
       'COMPROVANTE ENDEREÇO VALDECIR.pdf', '2025-11-13', '2025-12-16',
       'vencido', -211,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I83\vencidos\COMPROVANTE ENDEREÇO VALDECIR.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I83', 'CRLV',
       'CRLV_SES-9I83.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I83\sem-data\CRLV_SES-9I83.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SES9I83', 'NF_NORDICA',
       'NORDICA 367490.pdf', '2024-04-26', '2025-04-26',
       'vencido', -445,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SES9I83\vencidos\NORDICA 367490.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G35', 'IPEM',
       'AFERIÇÃO AZO9539.pdf', '2025-08-18', '2027-07-17',
       'ok', 367,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G35\AFERIÇÃO AZO9539.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G35', 'CIPP',
       'CIPP AZO-9539_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G35\sem-data\CIPP AZO-9539_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G35', 'CIV',
       'CIV AZO-9539_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G35\sem-data\CIV AZO-9539_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G35', 'CIV',
       'CIV SFL4G35_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G35\sem-data\CIV SFL4G35_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G35', 'OUTROS',
       'COMPROVANTE RESIDENCIA LUCIO.pdf', '2025-09-26', '2025-10-25',
       'vencido', -263,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G35\vencidos\COMPROVANTE RESIDENCIA LUCIO.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G35', 'CRLV',
       'CRLV_AZO9539.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G35\sem-data\CRLV_AZO9539.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G35', 'NF_NORDICA',
       'NORDICA 367311.pdf', '2024-04-24', '2025-04-24',
       'vencido', -447,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G35\vencidos\NORDICA 367311.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G35', 'CRLV',
       'SFL4G35-CRLV.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G35\sem-data\SFL4G35-CRLV.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G37', 'IPEM',
       'AFERIÇÃO AZO9538 (2).pdf', NULL, '2027-07-16',
       'ok', 365,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G37\AFERIÇÃO AZO9538 (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G37', 'CIPP',
       'CIPP AZO-9538_0001.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G37\sem-data\CIPP AZO-9538_0001.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G37', 'CIPP',
       'CIPP AZO9538.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G37\sem-data\CIPP AZO9538.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G37', 'CIV',
       'CIV AZO-9538_0001.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G37\sem-data\CIV AZO-9538_0001.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G37', 'CIV',
       'CIV AZO9538.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G37\sem-data\CIV AZO9538.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G37', 'CIV',
       'CIV SFL4G37.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G37\sem-data\CIV SFL4G37.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G37', 'CIV',
       'CIV SFL4G37_0001.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G37\sem-data\CIV SFL4G37_0001.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G37', 'CRLV',
       'CRLV AZO9538.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G37\sem-data\CRLV AZO9538.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G37', 'OUTROS',
       'laureci comprovante residencia.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G37\sem-data\laureci comprovante residencia.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G37', 'OUTROS',
       'MOOP LAURECI SORARES.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G37\sem-data\MOOP LAURECI SORARES.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G37', 'NF_NORDICA',
       'NORDICA 367601.pdf', '2024-04-29', '2025-04-29',
       'vencido', -442,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G37\vencidos\NORDICA 367601.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G37', 'CRLV',
       'SFL4G37-CRLV.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G37\sem-data\SFL4G37-CRLV.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G38', 'IPEM',
       'AFERIÇÃO ATZ0445 (3).pdf', NULL, '2027-06-25',
       'ok', 344,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G38\AFERIÇÃO ATZ0445 (3).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G38', 'IPEM',
       'AFERIÇÃO ATZ0445.pdf', NULL, '2025-04-18',
       'vencido', -454,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G38\vencidos\AFERIÇÃO ATZ0445.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G38', 'CIPP',
       'CIPP]ATZ-0445-PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G38\sem-data\CIPP]ATZ-0445-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G38', 'CIV',
       'CIV ATZ-0445-PONTUAL.pdf', NULL, '2026-03-23',
       'vencido', -115,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G38\vencidos\CIV ATZ-0445-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G38', 'CIV',
       'CIV SFL4G38_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G38\sem-data\CIV SFL4G38_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G38', 'OUTROS',
       'COMPROVANTE DE ENDEREÇO VALDEREI.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G38\sem-data\COMPROVANTE DE ENDEREÇO VALDEREI.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G38', 'CRLV',
       'CRLV_ATZ0445.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G38\sem-data\CRLV_ATZ0445.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G38', 'NF_NORDICA',
       'NORDICA 367602.pdf', '2024-04-29', '2025-04-29',
       'vencido', -442,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G38\vencidos\NORDICA 367602.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G38', 'CRLV',
       'SFL4G38-CRLV.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G38\sem-data\SFL4G38-CRLV.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G39', 'IPEM',
       'AFERIÇÃO ATR7723 (2).pdf', NULL, '2027-07-10',
       'ok', 359,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G39\AFERIÇÃO ATR7723 (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G39', 'CIPP',
       'CIPP ATR-7723_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G39\sem-data\CIPP ATR-7723_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G39', 'CIV',
       'CIV ATR-7723_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G39\sem-data\CIV ATR-7723_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G39', 'CIV',
       'CIV SFL4G39_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G39\sem-data\CIV SFL4G39_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G39', 'CRLV',
       'CLRV ATR7723 2025.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G39\sem-data\CLRV ATR7723 2025.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G39', 'CRLV',
       'CLRV ATR7723 2026.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G39\sem-data\CLRV ATR7723 2026.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G39', 'OUTROS',
       'COMPROVANTE DE ENDEREÇO WEBERSON.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G39\sem-data\COMPROVANTE DE ENDEREÇO WEBERSON.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G39', 'CRLV',
       'CRLV SFL4G39.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G39\sem-data\CRLV SFL4G39.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G39', 'OUTROS',
       'ENDEREÇO WEBERSON.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G39\sem-data\ENDEREÇO WEBERSON.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G39', 'OUTROS',
       'N20 WEBERSON.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G39\sem-data\N20 WEBERSON.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G39', 'OUTROS',
       'N35 WEBERSON.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G39\sem-data\N35 WEBERSON.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G39', 'NF_NORDICA',
       'NORDICA 367604.pdf', '2024-04-29', '2025-04-29',
       'vencido', -442,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G39\vencidos\NORDICA 367604.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G42', 'IPEM',
       'AFERIÇÃO ATZ0E42 (2).pdf', NULL, '2027-06-23',
       'ok', 342,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G42\AFERIÇÃO ATZ0E42 (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G42', 'CIPP',
       'CIPP ATZ0E42.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G42\sem-data\CIPP ATZ0E42.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G42', 'CIV',
       'CIV ATZ0E42.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G42\sem-data\CIV ATZ0E42.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G42', 'CIV',
       'CIV SFL4G42_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G42\sem-data\CIV SFL4G42_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G42', 'CRLV',
       'CLRV SFL4G42.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G42\sem-data\CLRV SFL4G42.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G42', 'CRLV',
       'CRLV_ATZ0E42.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G42\sem-data\CRLV_ATZ0E42.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G42', 'NF_NORDICA',
       'NORDICA 367603.pdf', '2024-04-29', '2025-04-29',
       'vencido', -442,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G42\vencidos\NORDICA 367603.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G42', 'OUTROS',
       'residencia Julio.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G42\sem-data\residencia Julio.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G43', 'IPEM',
       'AFERIÇÃO TBB-9D65.pdf', NULL, '2027-02-18',
       'ok', 217,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G43\AFERIÇÃO TBB-9D65.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G43', 'CIPP',
       'CIPP TBB9D65 PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G43\sem-data\CIPP TBB9D65 PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G43', 'CIV',
       'CIV SFL4G43-PONTUAL.pdf', NULL, '2026-02-23',
       'vencido', -143,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G43\vencidos\CIV SFL4G43-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G43', 'CIV',
       'CIV TBB9D65 PONTUAL.pdf', NULL, '2026-02-23',
       'vencido', -143,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G43\vencidos\CIV TBB9D65 PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G43', 'OUTROS',
       'COMPROVANTE ENDEREÇO EDSON.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G43\sem-data\COMPROVANTE ENDEREÇO EDSON.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G43', 'CRLV',
       'CRLV TBB9D65.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G43\sem-data\CRLV TBB9D65.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G43', 'NF_NORDICA',
       'NORDICA 367797.pdf', '2024-04-30', '2025-04-30',
       'vencido', -441,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G43\vencidos\NORDICA 367797.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G43', 'OUTROS',
       'NR - 35.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G43\sem-data\NR - 35.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G43', 'OUTROS',
       'NR -20.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G43\sem-data\NR -20.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G43', 'CRLV',
       'SFL4G43-CRLV.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G43\sem-data\SFL4G43-CRLV.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G49', 'IPEM',
       'AFERIÇÃO ATZ1243 (2).pdf', NULL, '2027-06-25',
       'ok', 344,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G49\AFERIÇÃO ATZ1243 (2).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G49', 'CIPP',
       'CIPP ATZ-1243 PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G49\sem-data\CIPP ATZ-1243 PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G49', 'CIV',
       'CIV ATZ-1243 PONTUAL.pdf', NULL, '2026-02-23',
       'vencido', -143,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G49\vencidos\CIV ATZ-1243 PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G49', 'CIV',
       'CIV SFL4G49_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G49\sem-data\CIV SFL4G49_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G49', 'CRLV',
       'CLRV SFL4G49.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G49\sem-data\CLRV SFL4G49.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G49', 'OUTROS',
       'COMPROVANTE RESIDENCIA IDINEI.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G49\sem-data\COMPROVANTE RESIDENCIA IDINEI.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G49', 'CRLV',
       'CRLV_ATZ1243.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G49\sem-data\CRLV_ATZ1243.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G49', 'NF_NORDICA',
       'NORDICA 367599.pdf', '2024-04-29', '2025-04-29',
       'vencido', -442,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G49\vencidos\NORDICA 367599.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G51', 'IPEM',
       'AFERIÇÃO ATR7I52.pdf', NULL, '2027-06-05',
       'ok', 324,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G51\AFERIÇÃO ATR7I52.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G51', 'CIPP',
       'CIPP ATR7I52_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G51\sem-data\CIPP ATR7I52_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G51', 'CIV',
       'CIV ATR7I52_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G51\sem-data\CIV ATR7I52_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G51', 'CIV',
       'CIV SFL4G51_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G51\sem-data\CIV SFL4G51_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G51', 'OUTROS',
       'COMPROVANTE DE ENDEREÇO AGADIR.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G51\sem-data\COMPROVANTE DE ENDEREÇO AGADIR.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G51', 'OUTROS',
       'COMPROVANTE RESIDENCIA AGADIR (3).pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G51\sem-data\COMPROVANTE RESIDENCIA AGADIR (3).pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G51', 'CRLV',
       'CRLV_ATR7I52.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G51\sem-data\CRLV_ATR7I52.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G51', 'NF_NORDICA',
       'NORDICA 367493.pdf', '2024-04-26', '2025-04-26',
       'vencido', -445,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G51\vencidos\NORDICA 367493.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G51', 'CRLV',
       'SFL4G51-CRLV.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G51\sem-data\SFL4G51-CRLV.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G80', 'IPEM',
       'AFERIÇÃO RHR-4E11.pdf', NULL, '2027-02-19',
       'ok', 218,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G80\AFERIÇÃO RHR-4E11.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G80', 'CIPP',
       'CIPP RHR4E11.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G80\sem-data\CIPP RHR4E11.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G80', 'CIV',
       'CIV RHR4E11.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G80\sem-data\CIV RHR4E11.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G80', 'CIV',
       'CIV SFL4G80.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G80\sem-data\CIV SFL4G80.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G80', 'OUTROS',
       'Comprovamte Residencia  VALDINEI DO CARMO DE ANDRADE.pdf', NULL, '2025-11-25',
       'vencido', -232,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G80\vencidos\Comprovamte Residencia  VALDINEI DO CARMO DE ANDRADE.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G80', 'CRLV',
       'CRLV RHR-4E11.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G80\sem-data\CRLV RHR-4E11.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G80', 'NF_NORDICA',
       'NORDICA 367489.pdf', '2024-04-26', '2025-04-26',
       'vencido', -445,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G80\vencidos\NORDICA 367489.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G80', 'CRLV',
       'SFL4G80-CRLV.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G80\sem-data\SFL4G80-CRLV.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G83', 'IPEM',
       'AFERIÇÃO ATZ1236.pdf', '2025-09-09', '2027-06-04',
       'ok', 324,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G83\AFERIÇÃO ATZ1236.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G83', 'CIPP',
       'CIPP ATZ1236_2026 (1).pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G83\sem-data\CIPP ATZ1236_2026 (1).pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G83', 'CIV',
       'CIV ATZ1236_2026.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G83\sem-data\CIV ATZ1236_2026.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G83', 'CIV',
       'CIV SFL4G83.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G83\sem-data\CIV SFL4G83.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G83', 'OUTROS',
       'COMPROVANTE RESIDENCIA VANDERSON (2).pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G83\sem-data\COMPROVANTE RESIDENCIA VANDERSON (2).pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G83', 'OUTROS',
       'comprovante residencia vanderson soares.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G83\sem-data\comprovante residencia vanderson soares.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G83', 'CRLV',
       'CRLV_ATZ1236.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G83\sem-data\CRLV_ATZ1236.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G83', 'NF_NORDICA',
       'NORDICA 367492.pdf', '2024-04-26', '2025-04-26',
       'vencido', -445,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G83\vencidos\NORDICA 367492.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G83', 'OUTROS',
       'NR_35_VANDERSON 01.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G83\sem-data\NR_35_VANDERSON 01.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G83', 'CRLV',
       'SFL4G83-CRLV.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G83\sem-data\SFL4G83-CRLV.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G85', 'IPEM',
       'AFERIÇÃO TBC6F27.pdf', NULL, '2027-02-25',
       'ok', 224,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G85\AFERIÇÃO TBC6F27.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G85', 'CIPP',
       'CIPP TBC6F27.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G85\sem-data\CIPP TBC6F27.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G85', 'CIV',
       'CIV SFL4G85.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G85\sem-data\CIV SFL4G85.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G85', 'CIV',
       'CIV TBC6F27.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G85\sem-data\CIV TBC6F27.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G85', 'OUTROS',
       'COMPROVANTE RESIDENCIA MARCIO (2).pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G85\sem-data\COMPROVANTE RESIDENCIA MARCIO (2).pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G85', 'OUTROS',
       'COMPROVANTE RESIDENCIA MARCIO MACHADO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G85\sem-data\COMPROVANTE RESIDENCIA MARCIO MACHADO.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G85', 'CRLV',
       'CRLV TBC6F27.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G85\sem-data\CRLV TBC6F27.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G85', 'OUTROS',
       'MOOP MARCIO ALBERTO DE BARROS MACHADO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G85\sem-data\MOOP MARCIO ALBERTO DE BARROS MACHADO.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G85', 'NF_NORDICA',
       'NORDICA 367495.pdf', '2024-04-26', '2025-04-26',
       'vencido', -445,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G85\vencidos\NORDICA 367495.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G85', 'CRLV',
       'SFL4G85-CRLV.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G85\sem-data\SFL4G85-CRLV.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G86', 'IPEM',
       'AFERIÇÃO TBF7J71.pdf', NULL, '2027-03-27',
       'ok', 254,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G86\AFERIÇÃO TBF7J71.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G86', 'OUTROS',
       'ATPV  TBF7J71.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G86\sem-data\ATPV  TBF7J71.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G86', 'CIPP',
       'CIPP TBF7J71.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G86\sem-data\CIPP TBF7J71.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G86', 'CIV',
       'CIV SFL4G86.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G86\sem-data\CIV SFL4G86.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G86', 'CIV',
       'CIV TBF7J71.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G86\sem-data\CIV TBF7J71.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G86', 'CIV',
       'CIV-SFL4G86 .pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G86\sem-data\CIV-SFL4G86 .pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G86', 'OUTROS',
       'Comprovante Residencia Vanderlei .pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G86\sem-data\Comprovante Residencia Vanderlei .pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G86', 'CRLV',
       'CRLV TBF7J71.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G86\sem-data\CRLV TBF7J71.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G86', 'NF_NORDICA',
       'NORDICA 367488.pdf', '2024-04-26', '2025-04-26',
       'vencido', -445,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G86\vencidos\NORDICA 367488.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G86', 'CRLV',
       'SFL4G86-CRLV.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G86\sem-data\SFL4G86-CRLV.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G87', 'OUTROS',
       '19024 - PONTUAL BRASIL TBE-1H59.pdf', NULL, '2025-03-14',
       'vencido', -488,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G87\vencidos\19024 - PONTUAL BRASIL TBE-1H59.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G87', 'IPEM',
       'AFERIÇÃO  TBE1H59.pdf', NULL, '2027-03-16',
       'ok', 243,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G87\AFERIÇÃO  TBE1H59.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G87', 'CIPP',
       'CIPP-TBE1H59-PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G87\sem-data\CIPP-TBE1H59-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G87', 'CIV',
       'CIV--SFL4G87-PONTUAL.pdf', NULL, '2026-03-17',
       'vencido', -121,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G87\vencidos\CIV--SFL4G87-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G87', 'CIV',
       'CIV-TBE1H59-PONTUAL.pdf', NULL, '2026-03-17',
       'vencido', -121,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G87\vencidos\CIV-TBE1H59-PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G87', 'OUTROS',
       'COMPROVANTE RESIDENCIA ELTON .pdf', '2025-11-12', '2025-12-10',
       'vencido', -217,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G87\vencidos\COMPROVANTE RESIDENCIA ELTON .pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G87', 'NF_NORDICA',
       'NORDICA 367494.pdf', '2024-04-26', '2025-04-26',
       'vencido', -445,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G87\vencidos\NORDICA 367494.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G87', 'CRLV',
       'SFL4G87-CRLV.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G87\sem-data\SFL4G87-CRLV.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G89', 'IPEM',
       'AFERIÇÃO AYC-4924.pdf', NULL, '2028-02-06',
       'ok', 570,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G89\AFERIÇÃO AYC-4924.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G89', 'CIPP',
       'CIPP AYC-4924.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G89\sem-data\CIPP AYC-4924.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G89', 'CIV',
       'CIV AYC-4924.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G89\sem-data\CIV AYC-4924.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G89', 'CIV',
       'CIV SFL4G89_PONTUAL.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G89\sem-data\CIV SFL4G89_PONTUAL.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G89', 'CRLV',
       'CRLV AYC4924.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G89\sem-data\CRLV AYC4924.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G89', 'CRLV',
       'CRLV SFL4G89.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G89\sem-data\CRLV SFL4G89.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G89', 'OUTROS',
       'ENDEREÇO ELIAZER.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G89\sem-data\ENDEREÇO ELIAZER.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G89', 'NF_NORDICA',
       'NORDICA 367598.pdf', '2024-04-29', '2025-04-29',
       'vencido', -442,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G89\vencidos\NORDICA 367598.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G89', 'OUTROS',
       'RESIDENCIA ELIAZER --052.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G89\sem-data\RESIDENCIA ELIAZER --052.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G90', 'IPEM',
       'AFERIÇÃO TBD-0F10.pdf', NULL, '2027-02-27',
       'ok', 226,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G90\AFERIÇÃO TBD-0F10.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G90', 'CIPP',
       'CIPP TBD0F10.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G90\sem-data\CIPP TBD0F10.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G90', 'CIV',
       'CIV SFL-4G90 2026.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G90\sem-data\CIV SFL-4G90 2026.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G90', 'CIV',
       'CIV TBD0F10.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G90\sem-data\CIV TBD0F10.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G90', 'OUTROS',
       'Comprovante residencia Everson .pdf', '2025-11-10', '2025-12-10',
       'vencido', -217,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G90\vencidos\Comprovante residencia Everson .pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G90', 'OUTROS',
       'comprovante residencia Leonardo .pdf', NULL, '2026-01-01',
       'vencido', -195,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G90\vencidos\comprovante residencia Leonardo .pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G90', 'CRLV',
       'CRLV TBD0F10.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G90\sem-data\CRLV TBD0F10.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G90', 'OUTROS',
       'endereco leonardo .pdf', NULL, '2026-01-01',
       'vencido', -195,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G90\vencidos\endereco leonardo .pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G90', 'OUTROS',
       'PONTUAL SES9I83 DNIT.pdf', NULL, '2025-08-19',
       'vencido', -330,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G90\vencidos\PONTUAL SES9I83 DNIT.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G90', 'OUTROS',
       'PONTUAL SES9I83_PARANA.pdf', NULL, '2025-09-19',
       'vencido', -299,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G90\vencidos\PONTUAL SES9I83_PARANA.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'SFL4G90', 'CRLV',
       'SFL4G90-CRLV.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\SFL4G90\sem-data\SFL4G90-CRLV.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H14', 'IPEM',
       'afericao tacografo TBX5H14.pdf', '2025-10-09', '2027-09-25',
       'ok', 437,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H14\afericao tacografo TBX5H14.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H14', 'IPEM',
       'AFERIÇÃO AKH2258.pdf', NULL, '2027-06-02',
       'ok', 321,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H14\AFERIÇÃO AKH2258.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H14', 'IPEM',
       'AFERIÇÃO APE2305.pdf', NULL, '2027-06-02',
       'ok', 321,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H14\AFERIÇÃO APE2305.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H14', 'CIPP',
       'CIPP AKH-2258.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H14\sem-data\CIPP AKH-2258.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H14', 'CIPP',
       'CIPP APE-2305.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H14\sem-data\CIPP APE-2305.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H14', 'CIV',
       'CIV AKH-2258.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H14\sem-data\CIV AKH-2258.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H14', 'CIV',
       'CIV APE-2305_001.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H14\sem-data\CIV APE-2305_001.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H14', 'OUTROS',
       'COMPROVANTE DE ENDEREÇO FÁBIO.pdf', NULL, '2025-12-09',
       'vencido', -218,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H14\vencidos\COMPROVANTE DE ENDEREÇO FÁBIO.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H14', 'CRLV',
       'CRLV AKH-2258.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H14\sem-data\CRLV AKH-2258.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H14', 'CRLV',
       'CRLV APE-2305.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H14\sem-data\CRLV APE-2305.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H14', 'CRLV',
       'CRLV TBX5H14.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H14\sem-data\CRLV TBX5H14.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H14', 'OUTROS',
       'PONTUAL BRASIL TBX5H14_FEDERAL DNIT 2026.pdf', NULL, '2027-04-28',
       'ok', 287,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H14\PONTUAL BRASIL TBX5H14_FEDERAL DNIT 2026.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H14', 'OUTROS',
       'PONTUAL BRASIL TBX5H14_PARANA CANA 2026.pdf', NULL, '2025-07-14',
       'vencido', -366,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H14\vencidos\PONTUAL BRASIL TBX5H14_PARANA CANA 2026.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H14', 'OUTROS',
       'RECIBO TBX5H14.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H14\sem-data\RECIBO TBX5H14.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H17', 'IPEM',
       'AFERIÇÃO AAK-7A44.pdf', NULL, '2028-02-06',
       'ok', 570,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H17\AFERIÇÃO AAK-7A44.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H17', 'IPEM',
       'AFERIÇÃO APE-2C98.pdf', NULL, '2028-02-06',
       'ok', 570,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H17\AFERIÇÃO APE-2C98.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H17', 'CIPP',
       'CIPP AAK7A44.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H17\sem-data\CIPP AAK7A44.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H17', 'CIPP',
       'CIPP-APE2C98.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H17\sem-data\CIPP-APE2C98.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H17', 'CIV',
       'CIV  APE2C98.pdf', NULL, '2026-01-20',
       'vencido', -177,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H17\vencidos\CIV  APE2C98.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H17', 'CIV',
       'CIV AAK7A44.pdf', NULL, '2026-01-20',
       'vencido', -177,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H17\vencidos\CIV AAK7A44.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H17', 'CRLV',
       'CRLV AKD5988.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H17\sem-data\CRLV AKD5988.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H17', 'CRLV',
       'CRLV TBX5H17.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H17\sem-data\CRLV TBX5H17.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H17', 'CRLV',
       'CRLV_ AAK-7A44.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H17\sem-data\CRLV_ AAK-7A44.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H17', 'CRLV',
       'CRLV_ APE-2C98.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H17\sem-data\CRLV_ APE-2C98.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H17', 'OUTROS',
       'PONTUAL TBX5H17 (CANA)_PARANA[1].pdf', NULL, '2025-07-14',
       'vencido', -366,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H17\vencidos\PONTUAL TBX5H17 (CANA)_PARANA[1].pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H17', 'OUTROS',
       'PONTUAL TBX5H17_FEDERAL.pdf', NULL, '2026-09-25',
       'vencendo_90d', 72,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H17\PONTUAL TBX5H17_FEDERAL.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('veiculos', 'TBX5H17', 'OUTROS',
       'RECIBO  TBX5H17.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Veiculos\TBX5H17\sem-data\RECIBO  TBX5H17.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('desligados', 'ADILSON FRAGOZO', 'CNH',
       'CNH ADILSON RIBEIRO FRAGOSO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Desligados\ADILSON FRAGOZO\sem-data\CNH ADILSON RIBEIRO FRAGOSO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('desligados', 'ADILSON FRAGOZO', 'CNH',
       'cnh adilson.pdf', NULL, '2028-05-05',
       'ok', 659,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Desligados\ADILSON FRAGOZO\cnh adilson.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('desligados', 'ADILSON FRAGOZO', 'MOPP',
       'MOPP ADILSON FRAGOZO.pdf', NULL, NULL,
       'sem_data', NULL,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Desligados\ADILSON FRAGOZO\sem-data\MOPP ADILSON FRAGOZO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('desligados', 'GUSTAVO DOMINGUES', 'CNH',
       'CNH GUSTAVO.pdf', NULL, '2032-02-03',
       'ok', 2028,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Desligados\GUSTAVO DOMINGUES\CNH GUSTAVO.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('desligados', 'GUSTAVO DOMINGUES', 'CNH',
       'CNH-e.pdf', NULL, '2032-02-03',
       'ok', 2028,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Desligados\GUSTAVO DOMINGUES\CNH-e.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('desligados', 'GUSTAVO DOMINGUES', 'MOPP',
       'EAD Cursos de Trânsito  MOPP.pdf', NULL, '2025-09-04',
       'vencido', -314,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Desligados\GUSTAVO DOMINGUES\vencidos\EAD Cursos de Trânsito  MOPP.pdf', FALSE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('desligados', 'GUSTAVO DOMINGUES', 'CNH',
       'GUSTAVO - CNH.pdf', NULL, '2032-02-03',
       'ok', 2028,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Desligados\GUSTAVO DOMINGUES\GUSTAVO - CNH.pdf', TRUE);
INSERT INTO frota_vencimentos_documentos
  (categoria, dono, tipo, arquivo, emissao, vencimento, status, dias_ate_vencer, caminho_local, extraido_via_ocr)
VALUES ('desligados', 'GUSTAVO DOMINGUES', 'MOPP',
       'GUSTAVO - MOPP.pdf', NULL, '2025-09-04',
       'vencido', -314,
       'C:/Users/Logistica01/projetos/logistica-ia/arquivo/frota-pontual/Desligados\GUSTAVO DOMINGUES\vencidos\GUSTAVO - MOPP.pdf', FALSE);
