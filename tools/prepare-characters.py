"""Pack the downloaded CC0 Quaternius bases, hairstyles and combat clips.

Usage: python3 tools/prepare-characters.py BASE_PACK.zip ANIMATION_LIBRARY.glb
No textures, network calls or external binaries are required. Original topology,
skin weights, inverse bind matrices and animation keyframes are preserved.
"""
import copy, json, pathlib, struct, sys, zipfile

OUT = pathlib.Path(__file__).resolve().parents[1] / 'dist/assets/characters'
KEEP = {'POSITION', 'NORMAL', 'JOINTS_0', 'WEIGHTS_0'}
CLIPS = {'Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Punch_Cross', 'Punch_Jab',
         'Sword_Attack', 'Pistol_Shoot', 'Pistol_Idle_Loop', 'Spell_Simple_Shoot',
         'Spell_Simple_Idle_Loop', 'Hit_Chest', 'Roll', 'Death01', 'Sitting_Idle_Loop'}

def read_glb(path):
    raw = pathlib.Path(path).read_bytes()
    assert raw[:4] == b'glTF'
    size = struct.unpack_from('<I', raw, 12)[0]
    return json.loads(raw[20:20+size]), raw[28+size:]

def pack(document, binary, output):
    doc = copy.deepcopy(document)
    views, mapping, data = [], {}, bytearray()
    def view(index):
        if index in mapping: return mapping[index]
        original = doc['bufferViews'][index]
        start = original.get('byteOffset', 0)
        data.extend(b'\0' * (-len(data) % 4))
        current = dict(original, buffer=0, byteOffset=len(data))
        data.extend(binary[start:start+original['byteLength']])
        mapping[index] = len(views); views.append(current)
        return mapping[index]
    used = set()
    for mesh in doc.get('meshes', []):
        for primitive in mesh['primitives']:
            primitive['attributes'] = {k:v for k,v in primitive['attributes'].items() if k in KEEP}
            used.update(primitive['attributes'].values())
            if 'indices' in primitive: used.add(primitive['indices'])
    for skin in doc.get('skins', []): used.add(skin['inverseBindMatrices'])
    for clip in doc.get('animations', []):
        for sampler in clip['samplers']: used.update([sampler['input'], sampler['output']])
    accessors = []
    indices = {}
    for index in sorted(used):
        accessor = copy.deepcopy(doc['accessors'][index])
        if 'bufferView' in accessor: accessor['bufferView'] = view(accessor['bufferView'])
        if 'sparse' in accessor:
            for field in ['indices', 'values']:
                accessor['sparse'][field]['bufferView'] = view(accessor['sparse'][field]['bufferView'])
        indices[index] = len(accessors); accessors.append(accessor)
    for mesh in doc.get('meshes', []):
        for primitive in mesh['primitives']:
            primitive['attributes'] = {k:indices[v] for k,v in primitive['attributes'].items()}
            if 'indices' in primitive: primitive['indices'] = indices[primitive['indices']]
    for skin in doc.get('skins', []): skin['inverseBindMatrices'] = indices[skin['inverseBindMatrices']]
    for clip in doc.get('animations', []):
        for sampler in clip['samplers']:
            sampler['input'] = indices[sampler['input']]; sampler['output'] = indices[sampler['output']]
    doc['accessors'], doc['bufferViews'] = accessors, views
    doc['buffers'] = [{'byteLength':len(data)}]
    for field in ['images', 'textures', 'samplers', 'extensions', 'extensionsUsed', 'extensionsRequired']:
        doc.pop(field, None)
    doc['materials'] = [{'name':m.get('name','Character'), 'pbrMetallicRoughness':
                        {'baseColorFactor':[1,1,1,1], 'metallicFactor':0, 'roughnessFactor':.65}}
                       for m in doc.get('materials', [])]
    doc.setdefault('asset', {})['generator'] = 'NEXUS CC0 asset preparation'
    payload = json.dumps(doc, separators=(',',':')).encode()
    payload += b' ' * (-len(payload)%4); data.extend(b'\0' * (-len(data)%4))
    result = struct.pack('<4sII', b'glTF', 2, 12+8+len(payload)+8+len(data))
    result += struct.pack('<I4s', len(payload), b'JSON') + payload
    result += struct.pack('<I4s', len(data), b'BIN\0') + data
    output.write_bytes(result)
    print(output.name, len(result), 'bytes')

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(sys.argv[1]) as archive:
        for suffix, target in [('Superhero_Male_FullBody.gltf','male.glb'),
                               ('Superhero_Female_FullBody.gltf','female.glb')]:
            name = next(n for n in archive.namelist() if n.endswith(suffix))
            doc = json.loads(archive.read(name))
            binary = archive.read(str(pathlib.PurePosixPath(name).parent / doc['buffers'][0]['uri']))
            pack(doc, binary, OUT / target)
        for hair in ['Hair_Beard','Hair_Buns','Hair_Buzzed','Hair_Long','Hair_SimpleParted']:
            name = next(n for n in archive.namelist() if '/Origin at 0/' in n and n.endswith(hair+'.gltf'))
            doc = json.loads(archive.read(name))
            binary = archive.read(str(pathlib.PurePosixPath(name).parent / doc['buffers'][0]['uri']))
            pack(doc, binary, OUT / (hair+'.glb'))
        license_name = next(n for n in archive.namelist() if n.endswith('License_Standard.txt'))
        (OUT/'LICENSE-BASES.txt').write_bytes(archive.read(license_name))
    doc, binary = read_glb(sys.argv[2])
    doc['animations'] = [clip for clip in doc['animations'] if clip['name'] in CLIPS]
    # The animation file retains its mannequin skeleton to keep bone-name binding inspectable.
    pack(doc, binary, OUT/'combat.glb')

if __name__ == '__main__': main()
