import sys
sys.path.append( '.' )
import io_three2
from io_three2 import exporter
from io_three2 import constants

settings = {

    constants.FACES: True,
    constants.VERTICES: True,
    constants.NORMALS: True,
    constants.UVS: True,
    constants.APPLY_MODIFIERS: True,
    constants.EXTRA_VGROUPS: '',
    constants.INDEX_TYPE: constants.UINT_16,
    constants.COLORS: False,
    constants.MATERIALS: True,
    constants.FACE_MATERIALS: True,
    constants.SCALE: 1,
    constants.FRAME_STEP: 1,
    constants.FRAME_INDEX_AS_TIME: False,
    constants.SCENE: False,
    constants.MIX_COLORS: False,
    constants.COMPRESSION: None,
    constants.MAPS: False,
    constants.ANIMATION: constants.OFF,
    constants.BONES: True,
    constants.SKINNING: True,
    constants.MORPH_TARGETS: False,
    constants.CAMERAS: False,
    constants.LIGHTS: False,
    constants.HIERARCHY: True,
    constants.COPY_TEXTURES: True,
    constants.TEXTURE_FOLDER: '',
    constants.LOGGING: constants.CRITICAL,
    constants.ENABLE_PRECISION: True,
    constants.PRECISION: constants.DEFAULT_PRECISION,
    constants.EMBED_GEOMETRY: True,
    constants.EMBED_ANIMATION: True,
    constants.GEOMETRY_TYPE: constants.GEOMETRY,
    constants.INFLUENCES_PER_VERTEX: 2,
    constants.INDENT: True
}
import bpy

exporter.export_scene(sys.argv[-1], settings)
