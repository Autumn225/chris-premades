import {disadvantageEffectData} from '../../constants.js';
import {chris} from '../../helperFunctions.js';
async function item({speaker, actor, token, character, item, args, scope, workflow}) {
    let template = canvas.scene.collections.templates.get(workflow.templateId);
    if (!template) return;
    await template.setFlag('chris-premades', 'template', {
        'name': 'moonbeam',
        'castLevel': workflow.castData.castLevel,
        'saveDC': chris.getSpellDC(workflow.item),
        'macroName': 'moonbeam',
        'templateUuid': template.uuid,
        'turn': 'start',
        'ignoreMove': false
    });
    let featureData = await chris.getItemFromCompendium('chris-premades.CPR Spell Features', 'Moonbeam - Move', false);
    if (!featureData) return;
    featureData.system.description.value = chris.getItemDescription('CPR - Descriptions', 'Moonbeam - Move');
    async function effectMacro () {
        await warpgate.revert(token.document, 'Moonbeam');
    }
    let effectData = {
        'label': 'Moonbeam',
        'icon': workflow.item.img,
        'transfer': false,
        'origin': workflow.item.uuid,
        'duration': {
            'seconds': 60
        },
        'flags': {
            'effectmacro': {
                'onDelete': {
                    'script': chris.functionToString(effectMacro)
                }
            },
            'chris-premades': {
                'spell': {
                    'moonbeam': {
                        'templateUuid': template.uuid
                    }
                },
                'vae': {
                    'button': featureData.name
                }
            }
        }
    };
    let updates = {
        'embedded': {
            'Item': {
                [featureData.name]: featureData
            },
            'ActiveEffect': {
                [effectData.label]: effectData
            }
        }
    };
    let options = {
        'permanent': false,
        'name': effectData.label,
        'description': effectData.label
    };
    await warpgate.mutate(workflow.token.document, updates, {}, options);
}
async function trigger(token, trigger) {
    let template = await fromUuid(trigger.templateUuid);
    if (!template) return;
    if (chris.inCombat()) {
        let turn = game.combat.round + '-' + game.combat.turn;
        let lastTurn = template.flags['chris-premades']?.spell?.moonbeam?.[token.id]?.turn;
        if (turn === lastTurn) return;
        await template.setFlag('chris-premades', 'spell.moonbeam.' + token.id + '.turn', turn);
    }
    let originUuid = template.flags.dnd5e?.origin;
    if (!originUuid) return;
    let originItem = await fromUuid(originUuid);
    if (!originItem) return;
    let featureData = await chris.getItemFromCompendium('chris-premades.CPR Spell Features', 'Moonbeam - Damage', false);
    if (!featureData) return;
    featureData.system.description.value = chris.getItemDescription('CPR - Descriptions', 'Moonbeam - Damage');
    featureData.system.save.dc = trigger.saveDC;
    featureData.system.damage.parts = [
        [
            trigger.castLevel + 'd10[radiant]',
            'radiant'
        ]
    ];
    delete featureData._id;
    let feature = new CONFIG.Item.documentClass(featureData, {'parent': originItem.actor});
    let options = {
        'showFullCard': false,
        'createWorkflow': true,
        'targetUuids': [token.uuid],
        'configureDialog': false,
        'versatile': false,
        'consumeResource': false,
        'consumeQuantity': false,
        'consumeUsage': false,
        'consumeSlot': false
    };
    let changeShape = token.actor.items.getName('Change Shape');
    let shapechanger = token.actor.items.getName('Shapechanger');
    if (changeShape || shapechanger) {
        await chris.createEffect(token.actor, disadvantageEffectData);
    }
    await MidiQOL.completeItemUse(feature, {}, options);
    if (shapechanger || shapechanger) {
        let effect = chris.findEffect(token.actor, 'Save Disadvantage');
        if (effect) await chris.removeEffect(effect);
    }
}
async function move({speaker, actor, token, character, item, args, scope, workflow}) {
    let effect = chris.findEffect(workflow.actor, 'Moonbeam');
    if (!effect) return;
    let templateUuid = effect.flags['chris-premades']?.spell?.moonbeam?.templateUuid;
    if (!templateUuid) return;
    let template = await fromUuid(templateUuid);
    if (!template) return;
    await workflow.actor.sheet.minimize();
    let position = await chris.aimCrosshair(workflow.token, 60, workflow.item.img, 2, 2);
    await workflow.actor.sheet.maximize();
    if (position.cancelled) return;
    let updates = {
        'x': position.x,
        'y': position.y
    };
    await template.update(updates);
}
export let moonbeam = {
    'item': item,
    'trigger': trigger,
    'move': move
}