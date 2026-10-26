# Records every overlay alert as an audio clip in each voice, with Kokoro (D:\Tools\Kokoro).
# Run: D:\Tools\Kokoro\.venv\Scripts\python.exe -I tools\make_voice.py
# Clip names must match clipFor() in app/src/index.html.
import itertools, os
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

KOKORO = r'D:\Tools\Kokoro'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app', 'src', 'voice')
# (Kokoro voice, language). am_michael is the default; the tray's Voice menu lists the same ids.
VOICES = {'am_michael': 'en-us', 'am_fenrir': 'en-us', 'am_puck': 'en-us', 'af_heart': 'en-us',
          'af_bella': 'en-us', 'af_nicole': 'en-us', 'bm_george': 'en-gb', 'bf_emma': 'en-gb'}
# "Roh-shahn" is spelled the way it should sound; plain "Roshan" comes out as "Russian"
ROSH = 'Roh-shahn'
RUNES = [('power', 'power rune'), ('bounty', 'bounty'), ('wisdom', 'wisdom'), ('lotus', 'lotus')]


def spoken_list(words):
    return words[0] if len(words) < 2 else ', '.join(words[:-1]) + ' and ' + words[-1]


def lines():
    out = {}
    for n in range(1, 5):
        for combo in itertools.combinations(RUNES, n):
            text = spoken_list([w for _, w in combo]) + ' in twenty seconds.'
            out['runes-' + '-'.join(i for i, _ in combo)] = text[0].upper() + text[1:]
    # water runes only spawn at 2:00 and 4:00, where the only other rune is the 4:00 bounty
    out['runes-water'] = 'Water runes in twenty seconds.'
    out['runes-water-bounty'] = 'Water runes and bounty in twenty seconds.'
    out['stack'] = 'Stack in five.'
    for pit in ('top', 'bottom'):
        out[f'rosh-move-{pit}'] = f'{ROSH} moves to the {pit} pit in thirty seconds.'
        out[f'rosh-maybe-{pit}'] = f'{ROSH} could be up now, {pit} pit.'
        out[f'rosh-up-{pit}'] = f'{ROSH} is up, {pit} pit.'
    out['aegis'] = 'Aegis runs out in thirty seconds.'
    # level-up, tips and matchup hints (app/src/skills.js, advice.js, matchup-rules.js); names stay on screen
    out['levelup-skill'] = 'Skill point ready.'
    out['levelup-ult'] = 'Level your ultimate.'
    out['levelup-talent'] = 'Talent point ready.'
    out['tip-deaths'] = "You're dying a lot. Stay near your towers and move with your team."
    out['tip-buyback'] = 'Keep gold for buyback.'
    out['tip-bkb'] = 'Your B K B is late.'
    out['hint-invis'] = 'They have an invisible hero. Carry dust or a sentry.'
    out['hint-vessel'] = 'They heal a lot. Get a Spirit Vessel.'
    # carry farming (app/src/farm.js)
    out['farm-ready'] = 'You can farm ancients now.'
    out['farm-up'] = 'Ancients are up near you.'
    out['farm-stack'] = 'Stack the ancients. Hit them at fifty-one.'
    return out


if __name__ == '__main__':
    k = Kokoro(os.path.join(KOKORO, 'kokoro-v1.0.onnx'), os.path.join(KOKORO, 'voices-v1.0.bin'))
    todo = lines()
    for voice, lang in VOICES.items():
        os.makedirs(os.path.join(OUT, voice), exist_ok=True)
        for clip, text in todo.items():
            path = os.path.join(OUT, voice, clip + '.ogg')
            if os.path.exists(path):   # delete a clip to re-record it
                continue
            audio, rate = k.create(text, voice=voice, speed=1.05, lang=lang)
            sf.write(path, audio, rate, format='OGG', subtype='VORBIS')
        print(voice, len(todo), 'clips')
