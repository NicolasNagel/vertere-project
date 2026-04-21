DO $$
DECLARE
  atd_id UUID;
  -- clinicas
  c_vetbem   UUID := 'b3e99c91-d35e-4ec4-9604-0c1598249575';
  c_hvc      UUID := '14fa3235-71ab-46d1-9db1-f04fca5e4d44';
  c_petcare  UUID := '81fd27f9-c492-4c0c-a32c-163e8235ed7b';
  -- veterinarios
  v_ana      UUID := 'fd4c3631-7275-41d9-bb1a-812fe7ebb8d6';
  v_carlos   UUID := '9276f184-37e1-4fcd-9adb-eb8ad9d62cb0';
  v_fernanda UUID := '4a85c27a-4548-42ca-b0f6-ff5b744c0590';
  v_roberto  UUID := '4add4ffc-7841-418f-87e9-7683fb613e22';
  v_juliana  UUID := '7e83d8f5-2623-4c4c-8fbe-82d10155351c';
  -- exames
  e_hemograma    UUID := 'c041aac7-1666-4bbb-911a-cf08a9a4f6e0'; -- 28
  e_creatinina   UUID := '9ec76719-f10e-4698-b66d-ff56b768817c'; -- 23
  e_ureia        UUID := 'a16cbb54-4be2-4407-a196-de833eefab25'; -- 23
  e_alt          UUID := '97986cfb-239e-47a2-b2a7-44e61c77c74f'; -- 20
  e_ast          UUID := 'd519f330-8b37-4f00-bdd4-f4dc83764dd2'; -- 20
  e_glicose      UUID := 'e9dcd71f-55bc-42fc-9f85-868f1f96bcae'; -- 20
  e_urinalise    UUID := 'e9db4182-b987-450b-873e-5d5a3277e242'; -- 35
  e_basico1      UUID := 'eff5444c-e5e5-42ec-9afe-32035dbafcea'; -- 60
  e_basico2      UUID := '9aadb05c-d434-46b6-a6b6-519d6529bb32'; -- 70
  e_checkup1     UUID := 'aa14c4eb-c35b-4dfb-86a3-f38c23893fd0'; -- 100
  e_checkup2     UUID := '65f0ed6b-cf0e-441a-b839-7370e71ef383'; -- 120
  e_checkup3     UUID := '394e462e-a2e8-4e49-b438-2092d81fa227'; -- 140
  e_renal1       UUID := 'a960232c-de81-48a9-bed4-e7de5d29997c'; -- 60
  e_renal2       UUID := 'e41e75e6-0ce5-4599-8688-7c6ec6ae6652'; -- 75
  e_hep1         UUID := 'aa17d872-0c3f-45e0-bc46-d7160130e8ba'; -- 70
  e_parasito     UUID := '6762fff8-5539-437a-b07d-65d834628e24'; -- 46
  e_opg          UUID := '7b6649eb-95b4-45e0-aa18-231d8ee2fceb'; -- 27
  e_plantao      UUID := 'd55353b7-3056-4f6f-b642-582ce284425d'; -- 100
  e_plantao_esp  UUID := '4aa99c9c-427f-4dd1-97b8-d90a2138db0f'; -- 150
  e_hemogaso_v   UUID := 'b9dccac4-0ff7-4589-af2c-ce356b9e1b6d'; -- 160
  e_proteina_p   UUID := 'a86dd083-c96b-40b0-9804-cb51528c18fc'; -- 23
  e_colesterol   UUID := '2373b80f-9923-43d1-b456-9c4e5f1850fa'; -- 26
  e_fa           UUID := '0310dc15-5d57-4bfe-92f9-a75d9adc3728'; -- 20
  e_potassio     UUID := '90aa98b3-b8ac-48ff-948a-23dd5372468d'; -- 35
  e_sodio        UUID := '45747fb2-728f-4f3b-9a3f-7e639fa2de78'; -- 35
  e_analise_q    UUID := '10bf473a-5d99-4455-b87d-3b2f3be2552e'; -- 27
  e_hematocrito  UUID := '3ceb01cc-a2ba-4308-8d04-448441b8b212'; -- 23
  e_plaquetas    UUID := '88ad2f82-3234-4ac0-b6ad-5abf408fdf60'; -- 24
  e_bacteriosco  UUID := 'f2a59383-0846-467e-bbd0-687497c0a8f7'; -- 27
  e_rpc          UUID := '3dfc9d41-7a1e-48e0-b005-e2bc51af5a56'; -- 35
  e_ggt          UUID := 'fb9668d5-e3f9-4b08-a35d-b67c1a71c692'; -- 20

BEGIN

  -- ─── Corrigir protocolos existentes ───────────────────────────────────────
  UPDATE atendimentos SET protocolo = 'P0001/2026' WHERE numero = 1 AND ano = 2026;
  UPDATE atendimentos SET protocolo = 'P0002/2026' WHERE numero = 2 AND ano = 2026;
  UPDATE atendimentos SET protocolo = 'P0003/2026' WHERE numero = 3 AND ano = 2026;

  -- ─── Janeiro 2026 ─────────────────────────────────────────────────────────

  -- 4: VetBem / Ana Paula / Thor / Golden Retriever / Hemograma + Creatinina + Ureia + ALT = 94
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0004/2026',4,2026,c_vetbem,v_ana,'Canino','M','Thor','Golden Retriever',3,'anos','José Santos','Coleta Venosa',94,'2026-01-15 09:30:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_hemograma,28),(atd_id,e_creatinina,23),(atd_id,e_ureia,23),(atd_id,e_alt,20);

  -- 5: HVC / Fernanda / Luna / SRD Felino / Urinálise + Análise Química = 62
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0005/2026',5,2026,c_hvc,v_fernanda,'Felino','F','Luna','SRD',5,'anos','Maria Oliveira','Coleta Urinária',62,'2026-01-22 10:15:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_urinalise,35),(atd_id,e_analise_q,27);

  -- 6: VetBem / Carlos / Max / Labrador / Check-up 2 = 120
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0006/2026',6,2026,c_vetbem,v_carlos,'Canino','M','Max','Labrador',7,'anos','Carlos Pereira','Coleta Venosa',120,'2026-01-28 08:45:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_checkup2,120);

  -- 7: PetCare / Juliana / Bella / Poodle filhote / Parasitológico + Hemograma = 74
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0007/2026',7,2026,c_petcare,v_juliana,'Canino','F','Bella','Poodle',2,'meses','Ana Lima','Fezes',74,'2026-01-31 14:00:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_parasito,46),(atd_id,e_hemograma,28);

  -- ─── Fevereiro 2026 ───────────────────────────────────────────────────────

  -- 8: HVC / Roberto / Rex / Pastor Alemão / PLANTÃO + Hemograma + Glicose = 148
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0008/2026',8,2026,c_hvc,v_roberto,'Canino','M','Rex','Pastor Alemão',4,'anos','Pedro Costa','Coleta Venosa',148,'2026-02-08 22:30:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_plantao,100),(atd_id,e_hemograma,28),(atd_id,e_glicose,20);

  -- 9: VetBem / Ana Paula / Mimi / Persa / Renal 1 + ALT + AST = 100
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0009/2026',9,2026,c_vetbem,v_ana,'Felino','F','Mimi','Persa',8,'anos','Juliana Ferreira','Coleta Venosa',100,'2026-02-14 11:00:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_renal1,60),(atd_id,e_alt,20),(atd_id,e_ast,20);

  -- 10: PetCare / Juliana / Bob / Bulldog / Básico 1 = 60
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0010/2026',10,2026,c_petcare,v_juliana,'Canino','M','Bob','Bulldog',1,'anos','Ricardo Alves','Coleta Venosa',60,'2026-02-20 09:00:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_basico1,60);

  -- 11: HVC / Fernanda / Nina / Siamês / Hemograma + Creatinina + FA + GGT = 91
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0011/2026',11,2026,c_hvc,v_fernanda,'Felino','F','Nina','Siamês',6,'anos','Fernanda Ramos','Coleta Venosa',91,'2026-02-25 15:30:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_hemograma,28),(atd_id,e_creatinina,23),(atd_id,e_fa,20),(atd_id,e_ggt,20);

  -- ─── Março 2026 ───────────────────────────────────────────────────────────

  -- 12: VetBem / Carlos / Bolt / Beagle / Parasitológico + OPG = 73
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0012/2026',12,2026,c_vetbem,v_carlos,'Canino','M','Bolt','Beagle',2,'anos','Marcos Souza','Fezes',73,'2026-03-05 10:30:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_parasito,46),(atd_id,e_opg,27);

  -- 13: PetCare / Juliana / Cleo / Ragdoll / PLANTÃO ESPECIAL + Hemogasometria Venosa = 310
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0013/2026',13,2026,c_petcare,v_juliana,'Felino','F','Cleo','Ragdoll',3,'anos','Luciana Mendes','Coleta Venosa',310,'2026-03-12 02:15:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_plantao_esp,150),(atd_id,e_hemogaso_v,160);

  -- 14: HVC / Roberto / Apolo / Rottweiler / Check-up 1 + Urinálise = 135
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0014/2026',14,2026,c_hvc,v_roberto,'Canino','M','Apolo','Rottweiler',5,'anos','Roberto Silva','Coleta Venosa',135,'2026-03-18 08:00:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_checkup1,100),(atd_id,e_urinalise,35);

  -- 15: VetBem / Ana Paula / Kitty / Maine Coon / Hepático 1 + Glicose + Proteína Plasmática = 113
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0015/2026',15,2026,c_vetbem,v_ana,'Felino','F','Kitty','Maine Coon',4,'anos','Camila Rocha','Coleta Venosa',113,'2026-03-25 13:45:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_hep1,70),(atd_id,e_glicose,20),(atd_id,e_proteina_p,23);

  -- 16: HVC / Fernanda / Simba / SRD filhote / Hemograma + Plaquetas + Hematócrito = 75
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0016/2026',16,2026,c_hvc,v_fernanda,'Canino','M','Simba','SRD',180,'dias','Eduardo Castro','Swab',75,'2026-03-30 10:00:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_hemograma,28),(atd_id,e_plaquetas,24),(atd_id,e_hematocrito,23);

  -- ─── Abril 2026 ───────────────────────────────────────────────────────────

  -- 17: PetCare / Juliana / Mel / Yorkshire / Básico 2 + Urinálise = 105
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0017/2026',17,2026,c_petcare,v_juliana,'Canino','F','Mel','Yorkshire',2,'anos','Beatriz Nunes','Coleta Urinária',105,'2026-04-02 09:30:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_basico2,70),(atd_id,e_urinalise,35);

  -- 18: VetBem / Carlos / Titan / Dobermann / Renal 2 + Hemograma + Creatinina = 126
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0018/2026',18,2026,c_vetbem,v_carlos,'Canino','M','Titan','Dobermann',6,'anos','Alexandre Gomes','Coleta Venosa',126,'2026-04-05 11:15:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_renal2,75),(atd_id,e_hemograma,28),(atd_id,e_creatinina,23);

  -- 19: HVC / Roberto / Lola / Shih Tzu / Colesterol + Glicose + Potássio + Sódio = 116
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0019/2026',19,2026,c_hvc,v_roberto,'Canino','F','Lola','Shih Tzu',3,'anos','Priscila Lima','Coleta Venosa',116,'2026-04-08 14:00:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_colesterol,26),(atd_id,e_glicose,20),(atd_id,e_potassio,35),(atd_id,e_sodio,35);

  -- 20: PetCare / Juliana / Bravo / Pitbull / PLANTÃO + Renal 1 + Creatinina = 183
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0020/2026',20,2026,c_petcare,v_juliana,'Canino','M','Bravo','Pitbull',5,'anos','Paulo Gomes','Coleta Venosa',183,'2026-04-10 21:45:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_plantao,100),(atd_id,e_renal1,60),(atd_id,e_creatinina,23);

  -- 21: VetBem / Ana Paula / Thor / Golden Retriever / retorno / Hemograma + ALT + AST + FA + Glicose = 108
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0021/2026',21,2026,c_vetbem,v_ana,'Canino','M','Thor','Golden Retriever',3,'anos','José Santos','Coleta Venosa',108,'2026-04-14 10:00:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_hemograma,28),(atd_id,e_alt,20),(atd_id,e_ast,20),(atd_id,e_fa,20),(atd_id,e_glicose,20);

  -- 22: HVC / Fernanda / Whisky / Golden Retriever idoso / Check-up 3 = 140
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0022/2026',22,2026,c_hvc,v_fernanda,'Canino','M','Whisky','Golden Retriever',9,'anos','Augusto Campos','Coleta Venosa',140,'2026-04-16 09:00:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_checkup3,140);

  -- 23: PetCare / Juliana / Estrela / SRD Felino / Urinálise + RPC + Bacterioscopia = 97
  INSERT INTO atendimentos (protocolo,numero,ano,clinica_id,veterinario_id,especie,sexo,nome_animal,raca,idade_valor,idade_unidade,nome_proprietario,metodo_coleta,valor_total,created_at)
  VALUES ('P0023/2026',23,2026,c_petcare,v_juliana,'Felino','F','Estrela','SRD',2,'anos','Sandra Vieira','Coleta Urinária',97,'2026-04-18 16:30:00')
  RETURNING id INTO atd_id;
  INSERT INTO atendimento_exames (atendimento_id,exame_id,valor) VALUES
    (atd_id,e_urinalise,35),(atd_id,e_rpc,35),(atd_id,e_bacteriosco,27);

END;
$$;
