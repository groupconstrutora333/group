# Blender na nuvem

Modelos 3D e renders feitos com o Blender rodando no servidor das sessões do Claude Code, sem precisar de computador.

- `casa_teste.py`: script de teste (casa de 2 pavimentos com deck e piscina).
- Gerar de novo: `blender -b -P blender/casa_teste.py`. Isso cria `teste_render.png` e `teste.blend` nesta pasta.
- Instalar o Blender numa sessão nova: `apt-get install -y blender`.
