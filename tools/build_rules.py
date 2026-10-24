#!/usr/bin/env python3
"""Split the private FNFF Markdown into ruleset.json for the site's Rules tab.

usage: build_rules.py [input.md] [output.json]
  defaults: ~/fnff_reference/ffnf_clean.md -> ~/fnff_reference/ruleset.json (upload as ruleset.json; GET /ruleset serves it)

A section is one heading (## / ### / ####) plus its text; weapon entries (`**Name** — `stat``) become level-5 sections.
Book page = scan page - 3. "arsenal" = the weapon picker (weapons.json + tables.json), "armor" = the armor picker.

The output contains the book's text: keep it out of the repo and the served site (it is git-ignored).
"""
import datetime
import hashlib
import json
import pathlib
import re
import sys

SCAN_TO_BOOK = 3
HEADING = re.compile(r"^(#{1,4}) (.+?)\s*$")
PAGE = re.compile(r"<!-- page (\d+) -->")
FRONT_MATTER = re.compile(r"<!-- pages \d+-\d+ -->")
WEAPON = re.compile(r"^\*\*(.+?)\*\* — `(.+?)`")
OCR_NOTE = re.compile(r"^_Machine-cleaned OCR")
# Book skill list (p. 1): Pistol = handguns; Rifle = rifles, shotguns and submachineguns.
FIREARM_SKILL = {"P": "Pistol", "SMG": "Rifle", "RIF": "Rifle", "SHG": "Rifle", "BOW": "Rifle"}   # the book names no bow skill
# weapons.json ammo code -> (ballistics group, ballistics row). Pointblank/close damage is used (the book's usual case).
AMMO = {
    ".22": ("pistol_smg", ".22 Short"), ".22lng": ("pistol_smg", ".22 Long"), ".25": ("pistol_smg", ".25"),
    ".32": ("pistol_smg", ".32"), ".38": ("pistol_smg", ".38"), ".45": ("pistol_smg", ".45 ACP"),
    ".357": ("pistol_smg", ".357 Magnum"), ".44": ("pistol_smg", ".44 Magnum"), "9mm": ("pistol_smg", "9mm Para"),
    "7.65": ("pistol_smg", "7.65 Mauser"), "5.56": ("rifle", "5.56 NATO"), "5.56N": ("rifle", "5.56 NATO"),
    "5.45S": ("rifle", "5.56 NATO"),      # no 5.45 row in the ballistics table: the 5.56 NATO row stands in
    "7.62N": ("rifle", "7.62 NATO"), "7.62S": ("rifle", "7.62 Soviet"), "30-06": ("rifle", "30-06"),
    "30-30": ("rifle", "30-30"), "12": ("shotgun", "12 Gauge 00"), "12g": ("shotgun", "12 Gauge 00"),
}
# The book's weapon text: bows do damage "as if .22 Long", crossbows "as if .38".
BOW_AMMO = {"Bow": ("pistol_smg", ".22 Long"), "Crossbow": ("pistol_smg", ".38")}
# weapons.json melee name -> melee_damage row; Spear has no row (1D6 assumed), the other chart rows have no weapons.json entry
MELEE_ROW = {"Knife or dagger": "Knife", "Nunchaku": "Nunchucks", "Sledgehammer": "Hammer"}
MELEE_ACCURACY_ROW = {"Knife": "Knife or dagger", "Nunchucks": "Nunchaku", "Hammer": "Sledgehammer"}
MELEE_FALLBACK = "1D6"
# Armor reference name -> pieces worn: (name, locations covered). The book gives no coverage, so these are the obvious readings
# (location names are the sheet's); "X or Y" entries become one piece each.
TORSO, ARMS, LEGS = ["Torso"], ["R.Arm", "L.Arm"], ["R.Leg", "L.Leg"]
ARMOR_PIECES = {
    "Armor T-Shirt Vest": [("Armor T-Shirt Vest", TORSO)],
    "Kevlar Armor Jacket": [("Kevlar Armor Jacket", TORSO + ARMS)],
    "Leather Jacket or Pants": [("Leather Jacket", TORSO + ARMS), ("Leather Pants", LEGS)],
    "Nylon Helmet": [("Nylon Helmet", ["Head"])],
    "Flack Vest or Pants": [("Flack Vest", TORSO), ("Flack Pants", LEGS)],
    "Doorgunner's Vest": [("Doorgunner's Vest", TORSO)],
}
NOT_SEARCHED = ("Contents", "Credits & Contents")     # they list every heading, so they'd match nearly every query


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "section"


def plain(md):
    """The markdown without its formatting, for searching."""
    text = re.sub(r"`([^`]*)`", r"\1", md)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"(^|[\s(])_([^_]+)_(?=[\s).,;:!?]|$)", r"\1\2", text)
    text = re.sub(r"^(#+|-) ", "", text, flags=re.M)
    return re.sub(r"\s+", " ", text).strip()


def join_split_paragraphs(text):
    """Join a paragraph that a page marker cut in two: it stops mid-sentence and goes on in lower case."""
    cut = re.compile(r"([^\n]*[^.!?:\"')\]`\s])\n+(<!-- page \d+ -->)\n+(?=[a-z])")

    def join(match):
        before = match.group(1)
        return match.group(0) if before.lstrip().startswith(("#", "- ", "_", "<!--")) else f"{before}\n{match.group(2)}\n"

    return cut.sub(join, text)


def parse(lines):
    sections, headings = [], {}     # headings: level -> title of the heading currently open at that level
    page = None                     # current book page

    def start(title, level, path):
        sections.append({"title": title, "level": level, "path": path, "page": page, "pageEnd": page, "lines": []})

    start("Credits & Contents", 2, ["Credits & Contents"])     # text before the first real heading

    for line in lines:
        marker = PAGE.fullmatch(line.strip())
        if marker:
            scan = int(marker.group(1))
            page = scan - SCAN_TO_BOOK if scan > SCAN_TO_BOOK else None
            if page:
                sections[-1]["pageEnd"] = page
                sections[-1]["page"] = sections[-1]["page"] or page
        elif FRONT_MATTER.fullmatch(line.strip()):
            page = None
        elif OCR_NOTE.match(line.strip()):
            continue
        elif (heading := HEADING.match(line)):
            level, title = len(heading.group(1)), heading.group(2)
            if level == 1:          # the document title
                continue
            headings = {k: v for k, v in headings.items() if k < level} | {level: title}
            start(title, level, [headings[k] for k in sorted(headings)])
        else:
            if (weapon := WEAPON.match(line)):
                current = sections[-1]
                parent = current["path"] if current["level"] < 5 else current["path"][:-1]
                start(weapon.group(1), 5, parent + [weapon.group(1)])
            sections[-1]["lines"].append(line)

    for section in sections:
        section["md"] = "\n".join(section.pop("lines")).strip()
        section["text"] = plain(section["md"])
        if section["pageEnd"] == section["page"]:
            del section["pageEnd"]
    return [s for s in sections if s["md"] or s["level"] <= 4]


def add_ids(sections):
    """A section's id is the slug of its title; a clash is qualified by the parent, then numbered."""
    used = set()
    for section in sections:
        base = slug(section["title"])
        candidate = slug(section["path"][-2]) + "-" + base if base in used and len(section["path"]) > 1 else base
        number = 2
        while candidate in used:
            candidate, number = f"{base}-{number}", number + 1
        used.add(candidate)
        section["id"] = candidate
        if section["title"] in NOT_SEARCHED:
            section["search"] = False


def arsenal(reference):
    """Weapon picker entries: { group, name, skill, accuracy, damage, capacity, note }."""
    tables = json.loads((reference / "tables.json").read_text())
    weapons = json.loads((reference / "weapons.json").read_text())["weapons"]
    by_name = {w["name"]: w for w in weapons}
    entries = []

    def add(group, name, skill, accuracy, damage, capacity, note):
        entries.append({"group": group, "name": name, "skill": skill, "accuracy": accuracy, "damage": damage, "capacity": capacity, "note": note})

    def stat_line(w, *extra):
        rof = [f"ROF {w['rof']}"] if isinstance(w["rof"], int) else []
        return " · ".join(rof + [f"Reliability {w['reliability']}", f"Availability {w['availability']}", f"Conceal {w['concealability']}", *extra])

    melee = lambda w: w["type"] in ("M", "SAW")
    for w in filter(lambda w: not melee(w), weapons):
        group, row = BOW_AMMO.get(w["name"]) or AMMO[w["ammo"]]
        add(w["category"], w["name"], FIREARM_SKILL[w["type"]], w["accuracy"], tables["ballistics"][group][row][0][1], w["shots"],
            stat_line(w, *([w["ammo"]] if w["ammo"] != "NA" else [])))

    chart = {k: v for k, v in tables["melee_damage"].items() if k != "Grenades"}     # a grenade is thrown, not swung
    for row, dice in chart.items():
        w = by_name.get(MELEE_ACCURACY_ROW.get(row, row))
        add("Melee weapons", w["name"] if w else row, "MeleeWeapons", w["accuracy"] if w else 0, dice, 0,
            stat_line(w) if w else "Not in the weapon list: accuracy 0")
    for w in filter(melee, weapons):
        if w["name"] not in chart and MELEE_ROW.get(w["name"]) not in chart and w["name"] not in {e["name"] for e in entries}:
            add("Melee weapons", w["name"], "MeleeWeapons", w["accuracy"], MELEE_FALLBACK, 0, stat_line(w, "No chart damage: 1D6 assumed"))

    # Hand to hand: the chart's damage without "+strength" (the sheet's damage box cannot add a body-type modifier).
    for skill, group in (("Brawling", "Brawling"), ("MartialArts", "Martial arts")):
        note = "Bludgeoning: add strength modifier, divide by 5" + (", add skill level" if skill == "MartialArts" else "")
        for attack, dice in tables["bludgeon_damage"].items():
            if attack != "rule":
                add(group, attack, skill, -1 if attack == "Kick" else 0, dice.split("+")[0], 0, note)
    return entries


def armor(reference):
    """Armor picker entries: { name, sp, locations, note }. The Steel Helmet is only in the SP chart, the rest in the reference."""
    tables = json.loads((reference / "tables.json").read_text())
    entries = [{"name": name, "sp": item["SP"], "locations": locations, "note": f"Cost {item['cost']}"}
               for key, item in tables["armor_reference"].items() for name, locations in ARMOR_PIECES[key]]
    return entries + [{"name": "Steel Helmet", "sp": tables["armor_sp"]["Steel Helmet"], "locations": ["Head"], "note": "From the SP chart"}]


def main():
    home = pathlib.Path.home() / "fnff_reference"
    source = pathlib.Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else home / "ffnf_clean.md"
    target = pathlib.Path(sys.argv[2]).expanduser() if len(sys.argv) > 2 else home / "ruleset.json"

    sections = parse(join_split_paragraphs(source.read_text()).splitlines())
    add_ids(sections)
    version = hashlib.sha1(json.dumps(sections, sort_keys=True).encode()).hexdigest()[:10]
    ruleset = {
        "version": version,
        "built": datetime.date.today().isoformat(),
        "source": "Friday Night Firefight (R. Talsorian Games, 1988) — private copy, OCR verified",
        "sections": sections,
        "arsenal": arsenal(home),
        "armor": armor(home),
    }
    target.write_text(json.dumps(ruleset, ensure_ascii=False, indent=1))
    print(f"{len(ruleset['arsenal'])} arsenal entries, {len(ruleset['armor'])} armor entries")
    print(f"{len(sections)} sections -> {target} ({target.stat().st_size // 1024} KB, version {version})")


if __name__ == "__main__":
    main()
