"""
Management command to seed rubric data including:
- GMC Communication Outcomes
- MLA Capabilities
- SPIKES Framework with sections and criteria
- Example templates
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.rubrics.models import (
    GMCCommunicationOutcome,
    MLACapability,
    RubricFramework,
    RubricSection,
    RubricCriterion,
    RubricCriterionGMCMapping,
    RubricCriterionMLAMapping,
    RubricTemplate,
    RubricTemplateCriterion,
    RubricPack,
    RubricPackEntry,
)


class Command(BaseCommand):
    help = 'Seed rubric data including GMC outcomes, MLA capabilities, and SPIKES framework'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing rubric data before seeding',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing rubric data...')
            self._clear_data()

        self.stdout.write('Seeding GMC Communication Outcomes...')
        gmc_outcomes = self._seed_gmc_outcomes()

        self.stdout.write('Seeding MLA Capabilities...')
        mla_capabilities = self._seed_mla_capabilities()

        self.stdout.write('Seeding SPIKES Framework...')
        framework, sections, criteria = self._seed_spikes_framework()

        self.stdout.write('Creating GMC and MLA mappings for criteria...')
        self._create_mappings(criteria, gmc_outcomes, mla_capabilities)

        self.stdout.write('Creating example templates...')
        templates = self._create_example_templates(framework, criteria)

        self.stdout.write('Creating example rubric pack...')
        self._create_example_pack(templates)

        self.stdout.write(self.style.SUCCESS('Rubric data seeding complete!'))

    def _clear_data(self):
        """Clear all rubric data."""
        RubricPackEntry.objects.all().delete()
        RubricPack.objects.all().delete()
        RubricTemplateCriterion.objects.all().delete()
        RubricTemplate.objects.all().delete()
        RubricCriterionGMCMapping.objects.all().delete()
        RubricCriterionMLAMapping.objects.all().delete()
        RubricCriterion.objects.all().delete()
        RubricSection.objects.all().delete()
        RubricFramework.objects.all().delete()
        GMCCommunicationOutcome.objects.all().delete()
        MLACapability.objects.all().delete()

    def _seed_gmc_outcomes(self):
        """Seed GMC Communication Outcomes."""
        outcomes_data = [
            {
                'code': 'GMC-C1',
                'title': 'Listen to patients and respond to their concerns and preferences',
                'description': 'Listen to patients, taking account of their views about their health, their priorities and preferences.',
                'domain': 'Communication'
            },
            {
                'code': 'GMC-C2',
                'title': 'Give patients clear, accurate and complete information',
                'description': 'Give patients the information they want or need to know in a way they can understand.',
                'domain': 'Communication'
            },
            {
                'code': 'GMC-C3',
                'title': 'Be honest and trustworthy',
                'description': 'Be honest and act with integrity in all professional and personal dealings.',
                'domain': 'Trust'
            },
            {
                'code': 'GMC-C4',
                'title': 'Treat patients with dignity and respect',
                'description': 'Treat patients as individuals and respect their dignity and autonomy.',
                'domain': 'Partnership'
            },
            {
                'code': 'GMC-C5',
                'title': 'Support patients in caring for themselves',
                'description': 'Work in partnership with patients, sharing information and supporting them to make decisions.',
                'domain': 'Partnership'
            },
            {
                'code': 'GMC-C6',
                'title': 'Respond to patients concerns and complaints',
                'description': 'Respond promptly, fully and honestly to complaints and apologise when appropriate.',
                'domain': 'Communication'
            },
            {
                'code': 'GMC-C7',
                'title': 'Ensure continuity of care',
                'description': 'Take responsibility for your patients care and ensure continuity and coordination.',
                'domain': 'Care'
            },
            {
                'code': 'GMC-C8',
                'title': 'Work collaboratively with colleagues',
                'description': 'Work effectively with colleagues and share relevant information with other team members.',
                'domain': 'Teamwork'
            },
        ]

        outcomes = {}
        for data in outcomes_data:
            outcome, created = GMCCommunicationOutcome.objects.update_or_create(
                code=data['code'],
                defaults={
                    'title': data['title'],
                    'description': data['description'],
                    'domain': data['domain']
                }
            )
            outcomes[data['code']] = outcome
            if created:
                self.stdout.write(f'  Created: {data["code"]}')

        return outcomes

    def _seed_mla_capabilities(self):
        """Seed MLA Capabilities."""
        capabilities_data = [
            {
                'code': 'MLA-PV1',
                'title': 'Professional behaviour and trust',
                'description': 'Demonstrates professional values including honesty, integrity, and respect for patients.',
                'category': 'Professional Values'
            },
            {
                'code': 'MLA-PV2',
                'title': 'Ethical and legal principles',
                'description': 'Applies ethical frameworks and understands legal requirements in clinical practice.',
                'category': 'Professional Values'
            },
            {
                'code': 'MLA-CS1',
                'title': 'Communication skills',
                'description': 'Communicates effectively with patients, families, carers and colleagues.',
                'category': 'Clinical Skills'
            },
            {
                'code': 'MLA-CS2',
                'title': 'Clinical reasoning and decision making',
                'description': 'Applies clinical reasoning to reach appropriate diagnoses and management plans.',
                'category': 'Clinical Skills'
            },
            {
                'code': 'MLA-CS3',
                'title': 'Patient safety and quality improvement',
                'description': 'Understands and applies principles of patient safety and quality improvement.',
                'category': 'Clinical Skills'
            },
            {
                'code': 'MLA-HK1',
                'title': 'Health knowledge application',
                'description': 'Applies biomedical, psychological and social science knowledge in clinical practice.',
                'category': 'Health Knowledge'
            },
            {
                'code': 'MLA-PP1',
                'title': 'Patient-centred care',
                'description': 'Delivers patient-centred care respecting individual needs and preferences.',
                'category': 'Patient Partnership'
            },
            {
                'code': 'MLA-PP2',
                'title': 'Shared decision making',
                'description': 'Engages patients in shared decision making about their care and treatment.',
                'category': 'Patient Partnership'
            },
        ]

        capabilities = {}
        for data in capabilities_data:
            capability, created = MLACapability.objects.update_or_create(
                code=data['code'],
                defaults={
                    'title': data['title'],
                    'description': data['description'],
                    'category': data['category']
                }
            )
            capabilities[data['code']] = capability
            if created:
                self.stdout.write(f'  Created: {data["code"]}')

        return capabilities

    def _seed_spikes_framework(self):
        """Seed SPIKES framework with sections and criteria."""
        # Create framework
        framework, created = RubricFramework.objects.update_or_create(
            code='SPIKES',
            defaults={
                'name': 'SPIKES Protocol',
                'description': 'A six-step protocol for delivering bad news in healthcare settings. '
                              'SPIKES stands for Setting, Perception, Invitation, Knowledge, Emotions, and Strategy/Summary.',
                'is_active': True
            }
        )
        if created:
            self.stdout.write(f'  Created framework: SPIKES')

        # Define sections with criteria
        sections_data = [
            {
                'code': 'S',
                'name': 'Setting up the Interview',
                'description': 'Prepare the physical setting and your mental readiness for the conversation.',
                'ordering': 1,
                'criteria': [
                    {
                        'text': 'Ensures privacy and minimizes interruptions',
                        'instructions': 'Look for evidence that the doctor acknowledged need for privacy, '
                                       'suggested closing the door, or asked to speak privately. '
                                       'Score 2 if explicitly addressed, 1 if implied, 0 if not addressed.',
                        'is_required': False
                    },
                    {
                        'text': 'Invites significant others as appropriate',
                        'instructions': 'Check if doctor asked about having family or support person present. '
                                       'Score 2 if asked and accommodated preference, 1 if mentioned but not followed through, '
                                       '0 if not addressed.',
                        'is_required': False
                    },
                    {
                        'text': 'Establishes rapport and connection',
                        'instructions': 'Look for warm greeting, appropriate eye contact cues, or attentive language. '
                                       'Score 2 if clear rapport building, 1 if minimal, 0 if cold or rushed.',
                        'is_required': False
                    },
                ]
            },
            {
                'code': 'P',
                'name': 'Perception',
                'description': "Assess the patient's perception of their medical situation.",
                'ordering': 2,
                'criteria': [
                    {
                        'text': 'Asks what patient already knows about their condition',
                        'instructions': 'Look for open-ended questions like "What have you been told?" or '
                                       '"What do you understand about...". Score 2 if explicitly asked, '
                                       '1 if partially explored, 0 if assumed knowledge.',
                        'is_required': True
                    },
                    {
                        'text': 'Corrects misinformation gently',
                        'instructions': 'If patient had misconceptions, did doctor correct them sensitively? '
                                       'Score 2 for tactful correction, 1 for blunt correction, 0 if misconceptions ignored. '
                                       'If no misinformation present, score based on readiness to clarify.',
                        'is_required': False
                    },
                ]
            },
            {
                'code': 'I',
                'name': 'Invitation',
                'description': "Obtain the patient's invitation to share information.",
                'ordering': 3,
                'criteria': [
                    {
                        'text': 'Asks permission before delivering news',
                        'instructions': 'Look for phrases like "Would it be okay if I share..." or '
                                       '"Are you ready to hear...". Score 2 if explicit permission sought, '
                                       '1 if implicit, 0 if proceeded without asking.',
                        'is_required': False
                    },
                    {
                        'text': 'Respects patient preferences for information level',
                        'instructions': 'Did doctor ask how much detail patient wanted? Score 2 if asked and adapted, '
                                       '1 if options presented without preference check, 0 if delivered standard information regardless.',
                        'is_required': False
                    },
                ]
            },
            {
                'code': 'K',
                'name': 'Knowledge',
                'description': 'Provide knowledge and information to the patient.',
                'ordering': 4,
                'criteria': [
                    {
                        'text': 'Uses warning shot before delivering bad news',
                        'instructions': 'Look for preparatory statements like "I have some difficult news" or '
                                       '"I wish I had better news". Score 2 if clear warning given, '
                                       '1 if subtle warning, 0 if no warning.',
                        'is_required': True
                    },
                    {
                        'text': 'Uses plain language and avoids jargon',
                        'instructions': 'Assess whether medical terms were explained or avoided. '
                                       'Score 2 if consistently clear language, 1 if some jargon with explanation, '
                                       '0 if heavy unexplained jargon.',
                        'is_required': False
                    },
                    {
                        'text': 'Delivers information in small chunks',
                        'instructions': 'Did doctor pause for understanding or deliver all at once? '
                                       'Score 2 if clear pacing with checks, 1 if some pacing, 0 if information dumped.',
                        'is_required': False
                    },
                    {
                        'text': 'Checks patient understanding',
                        'instructions': 'Look for "Does that make sense?" or asking patient to summarize. '
                                       'Score 2 if explicitly checked, 1 if implied, 0 if not checked.',
                        'is_required': False
                    },
                ]
            },
            {
                'code': 'E',
                'name': 'Emotions',
                'description': "Address the patient's emotions with empathy.",
                'ordering': 5,
                'criteria': [
                    {
                        'text': 'Acknowledges and validates emotional response',
                        'instructions': 'Look for empathic statements like "I can see this is upsetting" or '
                                       '"It is understandable to feel...". Score 2 if emotions explicitly acknowledged, '
                                       '1 if implicit, 0 if ignored.',
                        'is_required': True
                    },
                    {
                        'text': 'Allows silence for patient to process',
                        'instructions': 'In conversation flow, did doctor pause or rush? '
                                       'Score 2 if appropriate pacing with space for patient, 1 if some space, '
                                       '0 if rushed or filled silences.',
                        'is_required': False
                    },
                    {
                        'text': 'Offers support and continued presence',
                        'instructions': 'Look for statements like "I am here for you" or offers of continued support. '
                                       'Score 2 if explicit support offered, 1 if implied, 0 if not addressed.',
                        'is_required': False
                    },
                ]
            },
            {
                'code': 'S2',
                'name': 'Strategy and Summary',
                'description': 'Discuss strategy and summarize next steps.',
                'ordering': 6,
                'criteria': [
                    {
                        'text': 'Discusses treatment options or next steps',
                        'instructions': 'Did doctor outline what happens next? '
                                       'Score 2 if clear plan discussed, 1 if vague mention, 0 if no next steps addressed.',
                        'is_required': False
                    },
                    {
                        'text': 'Involves patient in decision-making',
                        'instructions': 'Look for shared decision-making language. '
                                       'Score 2 if patient preferences explicitly sought, 1 if options presented without preference check, '
                                       '0 if directive approach.',
                        'is_required': False
                    },
                    {
                        'text': 'Summarizes key points',
                        'instructions': 'Did doctor provide a summary of the conversation? '
                                       'Score 2 if clear summary, 1 if partial recap, 0 if no summary.',
                        'is_required': False
                    },
                    {
                        'text': 'Arranges follow-up',
                        'instructions': 'Look for discussion of next appointment or contact. '
                                       'Score 2 if specific follow-up arranged, 1 if mentioned generally, 0 if not addressed.',
                        'is_required': False
                    },
                ]
            },
        ]

        sections = {}
        criteria = {}

        for section_data in sections_data:
            section, created = RubricSection.objects.update_or_create(
                framework=framework,
                code=section_data['code'],
                defaults={
                    'name': section_data['name'],
                    'description': section_data['description'],
                    'ordering': section_data['ordering']
                }
            )
            sections[section_data['code']] = section
            if created:
                self.stdout.write(f'  Created section: {section_data["name"]}')

            for idx, crit_data in enumerate(section_data['criteria']):
                criterion, created = RubricCriterion.objects.update_or_create(
                    section=section,
                    criterion_text=crit_data['text'],
                    defaults={
                        'marking_instructions': crit_data['instructions'],
                        'is_required': crit_data['is_required'],
                        'ordering': idx
                    }
                )
                criteria[crit_data['text'][:30]] = criterion
                if created:
                    self.stdout.write(f'    Created criterion: {crit_data["text"][:50]}...')

        return framework, sections, criteria

    def _create_mappings(self, criteria, gmc_outcomes, mla_capabilities):
        """Create GMC and MLA mappings for criteria."""
        # Map criteria to GMC outcomes based on content
        mapping_rules = {
            'Ensures privacy': ['GMC-C4'],  # Dignity and respect
            'Invites significant': ['GMC-C4', 'GMC-C5'],  # Partnership
            'Establishes rapport': ['GMC-C1', 'GMC-C4'],  # Listen and respect
            'Asks what patient already': ['GMC-C1'],  # Listen
            'Corrects misinformation': ['GMC-C2', 'GMC-C3'],  # Clear info, honest
            'Asks permission': ['GMC-C4', 'GMC-C5'],  # Respect, partnership
            'Respects patient preference': ['GMC-C1', 'GMC-C5'],  # Listen, support
            'Uses warning shot': ['GMC-C2', 'GMC-C4'],  # Clear info, respect
            'Uses plain language': ['GMC-C2'],  # Clear info
            'Delivers information': ['GMC-C2'],  # Clear info
            'Checks patient underst': ['GMC-C1', 'GMC-C2'],  # Listen, clear info
            'Acknowledges and validates': ['GMC-C1', 'GMC-C4'],  # Listen, respect
            'Allows silence': ['GMC-C1', 'GMC-C4'],  # Listen, respect
            'Offers support': ['GMC-C5', 'GMC-C7'],  # Support, continuity
            'Discusses treatment': ['GMC-C2', 'GMC-C5'],  # Clear info, support
            'Involves patient': ['GMC-C1', 'GMC-C5'],  # Listen, partnership
            'Summarizes key': ['GMC-C2'],  # Clear info
            'Arranges follow-up': ['GMC-C7'],  # Continuity
        }

        mla_mapping_rules = {
            'Ensures privacy': ['MLA-PV1'],  # Professional behaviour
            'Invites significant': ['MLA-PP1'],  # Patient-centred
            'Establishes rapport': ['MLA-CS1'],  # Communication
            'Asks what patient already': ['MLA-CS1', 'MLA-PP1'],  # Communication, patient-centred
            'Corrects misinformation': ['MLA-CS1', 'MLA-HK1'],  # Communication, health knowledge
            'Asks permission': ['MLA-PV2', 'MLA-PP2'],  # Ethical, shared decision
            'Respects patient preference': ['MLA-PP1', 'MLA-PP2'],  # Patient-centred, shared decision
            'Uses warning shot': ['MLA-CS1'],  # Communication
            'Uses plain language': ['MLA-CS1'],  # Communication
            'Delivers information': ['MLA-CS1'],  # Communication
            'Checks patient underst': ['MLA-CS1'],  # Communication
            'Acknowledges and validates': ['MLA-CS1', 'MLA-PP1'],  # Communication, patient-centred
            'Allows silence': ['MLA-CS1'],  # Communication
            'Offers support': ['MLA-PP1'],  # Patient-centred
            'Discusses treatment': ['MLA-CS2', 'MLA-PP2'],  # Clinical reasoning, shared decision
            'Involves patient': ['MLA-PP2'],  # Shared decision
            'Summarizes key': ['MLA-CS1'],  # Communication
            'Arranges follow-up': ['MLA-CS3'],  # Patient safety
        }

        for criterion_key, criterion in criteria.items():
            # Find matching GMC rules
            for rule_key, gmc_codes in mapping_rules.items():
                if rule_key in criterion.criterion_text:
                    for gmc_code in gmc_codes:
                        if gmc_code in gmc_outcomes:
                            RubricCriterionGMCMapping.objects.get_or_create(
                                criterion=criterion,
                                gmc_outcome=gmc_outcomes[gmc_code]
                            )

            # Find matching MLA rules
            for rule_key, mla_codes in mla_mapping_rules.items():
                if rule_key in criterion.criterion_text:
                    for mla_code in mla_codes:
                        if mla_code in mla_capabilities:
                            RubricCriterionMLAMapping.objects.get_or_create(
                                criterion=criterion,
                                mla_capability=mla_capabilities[mla_code]
                            )

        self.stdout.write('  Mappings created')

    def _create_example_templates(self, framework, criteria):
        """Create example templates."""
        templates = {}

        # Full SPIKES template with all criteria
        full_template, created = RubricTemplate.objects.update_or_create(
            internal_code='SPIKES-FULL',
            defaults={
                'framework': framework,
                'display_label': 'Full SPIKES Protocol',
                'description': 'Complete SPIKES evaluation with all criteria',
                'track_type': 'generic_comms',
                'status': 'published'
            }
        )
        if created:
            self.stdout.write(f'  Created template: SPIKES-FULL')
        templates['SPIKES-FULL'] = full_template

        # Add all criteria to full template
        all_criteria = RubricCriterion.objects.filter(
            section__framework=framework
        ).order_by('section__ordering', 'ordering')

        for order, criterion in enumerate(all_criteria):
            RubricTemplateCriterion.objects.get_or_create(
                template=full_template,
                criterion=criterion,
                defaults={'ordering': order}
            )

        # Publish the template
        full_template.publish()

        # Essential SPIKES (required criteria only)
        essential_template, created = RubricTemplate.objects.update_or_create(
            internal_code='SPIKES-ESSENTIAL',
            defaults={
                'framework': framework,
                'display_label': 'Essential SPIKES Elements',
                'description': 'Core required elements of SPIKES protocol',
                'track_type': 'generic_comms',
                'status': 'published'
            }
        )
        if created:
            self.stdout.write(f'  Created template: SPIKES-ESSENTIAL')
        templates['SPIKES-ESSENTIAL'] = essential_template

        # Add only required criteria
        required_criteria = RubricCriterion.objects.filter(
            section__framework=framework,
            is_required=True
        ).order_by('section__ordering', 'ordering')

        for order, criterion in enumerate(required_criteria):
            RubricTemplateCriterion.objects.get_or_create(
                template=essential_template,
                criterion=criterion,
                defaults={'ordering': order}
            )

        essential_template.publish()

        return templates

    def _create_example_pack(self, templates):
        """Create example rubric pack."""
        pack, created = RubricPack.objects.update_or_create(
            name='Standard Communication Assessment',
            defaults={
                'description': 'Standard rubric pack for assessing communication skills using SPIKES protocol',
                'is_active': True
            }
        )
        if created:
            self.stdout.write(f'  Created pack: Standard Communication Assessment')

        # Add templates to pack
        for order, (code, template) in enumerate(templates.items()):
            RubricPackEntry.objects.get_or_create(
                pack=pack,
                template=template,
                defaults={'ordering': order}
            )

        return pack
