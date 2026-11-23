"""Drive the official Even Hub simulator HTTP automation API."""
from io import BytesIO
import json
import os
from pathlib import Path
import time
from urllib.request import Request, urlopen

from PIL import Image

base = os.environ.get('GO_SIMULATOR_URL', 'http://127.0.0.1:9898')
output = Path(os.environ.get('GO_SIMULATOR_ARTIFACTS', '/tmp/mri-go-screens'))
output.mkdir(parents=True, exist_ok=True)
last = -1

def get(path):
    with urlopen(base + path, timeout=10) as response:
        return response.read()

def wait_for(phase, timeout=12):
    global last
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        for entry in json.loads(get('/api/console'))['entries']:
            if entry['id'] > last and phase in entry['message']:
                last = entry['id']
                return entry['message']
        time.sleep(.12)
    raise AssertionError(f'Simulator did not reach {phase!r}')

def send(action):
    request = Request(base + '/api/input', data=json.dumps({'action':action}).encode(),
                      headers={'Content-Type':'application/json'}, method='POST')
    with urlopen(request, timeout=5) as response:
        assert response.status == 200
    time.sleep(.48)

def shot(name, minimum=125):
    data = get('/api/screenshot/glasses')
    image = Image.open(BytesIO(data))
    assert image.size == (576, 288) and image.mode == 'RGBA'
    assert sum(image.getchannel('A').histogram()[1:]) >= minimum
    (output / (name + '.png')).write_bytes(data)
    return image

assert get('/api/ping').strip() == b'pong'
wait_for('phase=home menu=Quick Study')
home = shot('01-menu')
send('click')
wait_for('phase=prompt')
question = shot('02-question')
send('click')
wait_for('phase=choices')
send('down')
wait_for('phase=choices')
shot('03-choice')
send('click')
wait_for('phase=confirm')
shot('04-confirm')
send('click')
wait_for('phase=feedback')
feedback = shot('05-feedback')
assert question.tobytes() != feedback.tobytes()
send('double_click')
wait_for('phase=home menu=Quick Study')
send('down')
wait_for('phase=home menu=Flashcards')
send('click')
wait_for('phase=prompt card=')
send('click')
wait_for('phase=card-answer card=')
shot('06-flashcard')
send('click')
wait_for('phase=prompt card=')
send('double_click')
wait_for('phase=home menu=Flashcards')
send('down')
wait_for('phase=home menu=Weak Areas')
send('click')
wait_for('phase=prompt')
send('double_click')
wait_for('phase=home menu=Weak Areas')
send('down')
wait_for('phase=home menu=Physics Recall')
send('click')
wait_for('phase=prompt card=')

for _ in range(55):
    send('click')
    card=wait_for('phase=card-answer card=').rsplit('=',1)[-1]
    if card in ('go-card-t1','go-card-t2'):
        send('up')
        wait_for('phase=card-answer card=')
        send('click')
        wait_for('phase=diagram card=')
        curve=shot('07-curve')
        assert sum(curve.crop((167,60,409,193)).getchannel('A').histogram()[1:])>150
        send('double_click')
        wait_for('phase=card-answer card=')
        break
    send('click')
    wait_for('phase=prompt card=')
else:
    raise AssertionError('No relaxation card reached for diagram exercise')

send('double_click')
wait_for('phase=home menu=Physics Recall')
before_exit=shot('08-before-exit')
send('double_click')
wait_for('requested system exit mode=1')
# This simulator build can clear the framebuffer instead of drawing the
# on-device OS confirmation UI. Assert the call and its display transition.
after_exit=shot('09-system-exit',minimum=0)
assert before_exit.tobytes()!=after_exit.tobytes()
errors=[e for e in json.loads(get('/api/console'))['entries'] if e.get('level')=='error']
assert not errors,errors
print(f'Official simulator passed. Framebuffers saved to {output}.')
