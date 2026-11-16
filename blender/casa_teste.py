import os
D=os.path.dirname(os.path.abspath(__file__))
import bpy, math
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
def mat(n,c,r=0.5):
    m=bpy.data.materials.new(n); m.use_nodes=True
    b=m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value=(*c,1); b.inputs["Roughness"].default_value=r; return m
def box(n,loc,dim,m):
    bpy.ops.mesh.primitive_cube_add(location=loc); o=bpy.context.object; o.name=n; o.scale=[d/2 for d in dim]; o.data.materials.append(m); return o
grama=mat("grama",(0.15,0.35,0.12),0.9); branco=mat("branco",(0.92,0.91,0.88)); madeira=mat("madeira",(0.45,0.28,0.15),0.6)
vidro=mat("vidro",(0.2,0.3,0.35),0.05); pedra=mat("pedra",(0.35,0.34,0.32),0.8); agua=mat("agua",(0.1,0.45,0.6),0.05)
box("terreno",(0,0,-0.05),(40,40,0.1),grama)
box("terreo",(0,0,1.5),(16,10,3),branco)
box("superior",(2,1,4.6),(12,8,3.2),madeira)
box("laje",(1,0.5,6.3),(17,11,0.3),branco)
box("vidro_terreo",(0,-5.02,1.5),(12,0.05,2.6),vidro)
box("vidro_sup",(2,-3.02,4.6),(9,0.05,2.4),vidro)
box("deck",(0,-8,0.05),(16,5,0.1),pedra)
box("piscina",(-1,-9,0.07),(10,3,0.05),agua)
bpy.ops.object.light_add(type='SUN',rotation=(math.radians(50),0,math.radians(35))); bpy.context.object.data.energy=4
w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[0].default_value=(0.55,0.7,0.9,1); w.node_tree.nodes["Background"].inputs[1].default_value=0.8
bpy.ops.object.camera_add(location=(22,-26,9)); cam=bpy.context.object; sc.camera=cam
c=cam.constraints.new('TRACK_TO'); bpy.ops.object.empty_add(location=(0,0,2.5)); c.target=bpy.context.object
sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=128; sc.cycles.use_denoising=False
sc.render.resolution_x=1600; sc.render.resolution_y=1000; sc.render.filepath=os.path.join(D,"teste_render.png")
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(D,"teste.blend"))
