"""
Rubric models for assessment framework management.

This module defines the complete rubric system hierarchy:
- Reference tables (GMC, MLA standards)
- Framework and structure (Framework -> Section -> Criterion)
- Templates and packs for organizing and deploying rubrics
"""
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


# =============================================================================
# Reference Tables
# =============================================================================

class GMCCommunicationOutcome(models.Model):
    """
    GMC (General Medical Council) communication outcome standards.
    Seeded from official GMC documentation.
    """
    code = models.CharField(
        max_length=20,
        unique=True,
        help_text="Unique code, e.g., 'GMC-C1'"
    )
    title = models.CharField(
        max_length=255,
        help_text="Short title of the outcome"
    )
    description = models.TextField(
        help_text="Full description of the communication outcome"
    )
    domain = models.CharField(
        max_length=100,
        help_text="Domain category, e.g., 'Communication', 'Partnership'"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'gmc_communication_outcomes'
        verbose_name = 'GMC Communication Outcome'
        verbose_name_plural = 'GMC Communication Outcomes'
        ordering = ['code']

    def __str__(self):
        return f"{self.code}: {self.title}"


class MLACapability(models.Model):
    """
    MLA (Medical Licensing Assessment) capability framework.
    Seeded from MLA capability documentation.
    """
    code = models.CharField(
        max_length=20,
        unique=True,
        help_text="Unique code, e.g., 'MLA-CAP-1'"
    )
    title = models.CharField(
        max_length=255,
        help_text="Short title of the capability"
    )
    description = models.TextField(
        help_text="Full description of the capability"
    )
    category = models.CharField(
        max_length=100,
        help_text="Category, e.g., 'Professional Values', 'Clinical Skills'"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mla_capabilities'
        verbose_name = 'MLA Capability'
        verbose_name_plural = 'MLA Capabilities'
        ordering = ['code']

    def __str__(self):
        return f"{self.code}: {self.title}"


class MLACondition(models.Model):
    """
    MLA condition/presentation mapping.
    Placeholder for future MLA content map integration.
    """
    code = models.CharField(
        max_length=20,
        unique=True,
        help_text="Unique code for the condition"
    )
    name = models.CharField(
        max_length=255,
        help_text="Name of the condition/presentation"
    )
    category = models.CharField(
        max_length=100,
        blank=True,
        help_text="Category of condition"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mla_conditions'
        verbose_name = 'MLA Condition'
        verbose_name_plural = 'MLA Conditions'
        ordering = ['code']

    def __str__(self):
        return f"{self.code}: {self.name}"


# =============================================================================
# Core Rubric Structure
# =============================================================================

class RubricFramework(models.Model):
    """
    Communication framework defining the evaluation structure.
    Examples: SPIKES, Calgary-Cambridge, SBAR
    """
    name = models.CharField(
        max_length=255,
        help_text="Display name of the framework"
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique code identifier, e.g., 'SPIKES'"
    )
    description = models.TextField(
        blank=True,
        help_text="Detailed description of the framework and its purpose"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this framework is available for use"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'rubric_frameworks'
        verbose_name = 'Rubric Framework'
        verbose_name_plural = 'Rubric Frameworks'
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_sections_with_criteria(self):
        """Return sections with their criteria for this framework."""
        return self.sections.prefetch_related('criteria').order_by('ordering')


class RubricSection(models.Model):
    """
    Section within a framework. Framework-specific.
    For SPIKES: Setting, Perception, Invitation, Knowledge, Emotions, Strategy/Summary
    """
    framework = models.ForeignKey(
        RubricFramework,
        on_delete=models.CASCADE,
        related_name='sections',
        help_text="Parent framework this section belongs to"
    )
    name = models.CharField(
        max_length=255,
        help_text="Display name of the section"
    )
    code = models.CharField(
        max_length=50,
        help_text="Short code, e.g., 'S', 'P', 'I', 'K', 'E', 'S2'"
    )
    description = models.TextField(
        blank=True,
        help_text="Detailed description of what this section covers"
    )
    ordering = models.PositiveIntegerField(
        default=0,
        help_text="Display order within the framework"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'rubric_sections'
        verbose_name = 'Rubric Section'
        verbose_name_plural = 'Rubric Sections'
        ordering = ['framework', 'ordering', 'name']
        unique_together = ['framework', 'code']

    def __str__(self):
        return f"{self.framework.code} - {self.name}"


class RubricCriterion(models.Model):
    """
    Individual criterion within a section.
    Contains marking instructions for AI evaluator.
    Supports 0-2 scoring:
    - 0 = Not addressed
    - 1 = Partly addressed / superficial
    - 2 = Fully addressed / appropriate
    """
    section = models.ForeignKey(
        RubricSection,
        on_delete=models.CASCADE,
        related_name='criteria',
        help_text="Parent section this criterion belongs to"
    )
    criterion_text = models.CharField(
        max_length=500,
        help_text="The criterion statement to be evaluated"
    )
    marking_instructions = models.TextField(
        help_text="Detailed instructions for evaluating this criterion"
    )
    weight = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=1.00,
        help_text="Relative weight of this criterion (1.00 = standard)"
    )
    is_required = models.BooleanField(
        default=False,
        help_text="If true, must be addressed to pass overall assessment"
    )
    ordering = models.PositiveIntegerField(
        default=0,
        help_text="Display order within the section"
    )

    # M2M mappings to reference standards
    gmc_outcomes = models.ManyToManyField(
        GMCCommunicationOutcome,
        through='RubricCriterionGMCMapping',
        related_name='criteria',
        blank=True,
        help_text="GMC outcomes this criterion maps to"
    )
    mla_capabilities = models.ManyToManyField(
        MLACapability,
        through='RubricCriterionMLAMapping',
        related_name='criteria',
        blank=True,
        help_text="MLA capabilities this criterion maps to"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'rubric_criteria'
        verbose_name = 'Rubric Criterion'
        verbose_name_plural = 'Rubric Criteria'
        ordering = ['section', 'ordering']

    def __str__(self):
        return f"{self.section.name}: {self.criterion_text[:50]}"

    @property
    def framework(self):
        """Convenience property to access the framework."""
        return self.section.framework


class RubricCriterionGMCMapping(models.Model):
    """
    Explicit join table for criterion-to-GMC outcome mapping.
    Allows adding metadata to the relationship.
    """
    criterion = models.ForeignKey(
        RubricCriterion,
        on_delete=models.CASCADE,
        related_name='gmc_mappings'
    )
    gmc_outcome = models.ForeignKey(
        GMCCommunicationOutcome,
        on_delete=models.CASCADE,
        related_name='criterion_mappings'
    )
    notes = models.TextField(
        blank=True,
        help_text="Optional notes about this mapping"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rubric_criterion_gmc_mappings'
        verbose_name = 'Criterion GMC Mapping'
        verbose_name_plural = 'Criterion GMC Mappings'
        unique_together = ['criterion', 'gmc_outcome']

    def __str__(self):
        return f"{self.criterion.criterion_text[:30]} -> {self.gmc_outcome.code}"


class RubricCriterionMLAMapping(models.Model):
    """
    Explicit join table for criterion-to-MLA capability mapping.
    """
    criterion = models.ForeignKey(
        RubricCriterion,
        on_delete=models.CASCADE,
        related_name='mla_mappings'
    )
    mla_capability = models.ForeignKey(
        MLACapability,
        on_delete=models.CASCADE,
        related_name='criterion_mappings'
    )
    notes = models.TextField(
        blank=True,
        help_text="Optional notes about this mapping"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rubric_criterion_mla_mappings'
        verbose_name = 'Criterion MLA Mapping'
        verbose_name_plural = 'Criterion MLA Mappings'
        unique_together = ['criterion', 'mla_capability']

    def __str__(self):
        return f"{self.criterion.criterion_text[:30]} -> {self.mla_capability.code}"


# =============================================================================
# Templates and Packs
# =============================================================================

class RubricTemplate(models.Model):
    """
    A curated selection of criteria from a framework.
    Can be draft or published. Only published templates can be used in live activities.
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    TRACK_TYPE_CHOICES = [
        ('generic_comms', 'Generic Communication'),
        ('clinical_content', 'Clinical Content'),
    ]

    framework = models.ForeignKey(
        RubricFramework,
        on_delete=models.PROTECT,
        related_name='templates',
        help_text="Framework this template is based on"
    )
    display_label = models.CharField(
        max_length=255,
        help_text="User-friendly display name"
    )
    internal_code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Internal reference code, e.g., 'RUB-SPIKES-MIG-01'"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of what this template covers"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        help_text="Publication status"
    )
    track_type = models.CharField(
        max_length=20,
        choices=TRACK_TYPE_CHOICES,
        default='clinical_content',
        help_text="Track classification for this template"
    )
    version = models.PositiveIntegerField(
        default=1,
        help_text="Version number for tracking changes"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this template was published"
    )

    class Meta:
        db_table = 'rubric_templates'
        verbose_name = 'Rubric Template'
        verbose_name_plural = 'Rubric Templates'
        ordering = ['framework', 'display_label']

    def __str__(self):
        return f"{self.display_label} ({self.internal_code})"

    def publish(self):
        """Mark template as published with timestamp."""
        self.status = 'published'
        self.published_at = timezone.now()
        self.save()

    def get_criteria_ordered(self):
        """Return template criteria in order."""
        return self.template_criteria.select_related(
            'criterion__section'
        ).order_by('ordering')

    @property
    def is_published(self):
        return self.status == 'published'


class RubricTemplateCriterion(models.Model):
    """
    Join table linking templates to criteria with ordering.
    """
    template = models.ForeignKey(
        RubricTemplate,
        on_delete=models.CASCADE,
        related_name='template_criteria',
        help_text="Parent template"
    )
    criterion = models.ForeignKey(
        RubricCriterion,
        on_delete=models.PROTECT,
        related_name='in_templates',
        help_text="Criterion included in this template"
    )
    ordering = models.PositiveIntegerField(
        default=0,
        help_text="Display order within the template"
    )
    weight_override = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override the criterion weight for this template"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rubric_template_criteria'
        verbose_name = 'Template Criterion'
        verbose_name_plural = 'Template Criteria'
        ordering = ['template', 'ordering']
        unique_together = ['template', 'criterion']

    def __str__(self):
        return f"{self.template.internal_code} - {self.criterion.criterion_text[:40]}"

    @property
    def effective_weight(self):
        """Return the weight override if set, otherwise the criterion weight."""
        if self.weight_override is not None:
            return self.weight_override
        return self.criterion.weight


class RubricPack(models.Model):
    """
    Collection of templates that can be assigned to an activity.
    """
    name = models.CharField(
        max_length=255,
        help_text="Display name of the pack"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of what this pack covers"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this pack is available for use"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'rubric_packs'
        verbose_name = 'Rubric Pack'
        verbose_name_plural = 'Rubric Packs'
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_all_criteria(self, include_generic=True):
        """
        Get all criteria from all templates in this pack.
        Optionally exclude generic_comms templates.

        Returns a list of dicts with criterion, template, and effective weight.
        """
        entries = self.entries.select_related(
            'template__framework'
        ).prefetch_related(
            'template__template_criteria__criterion__section'
        )

        if not include_generic:
            entries = entries.exclude(template__track_type='generic_comms')

        criteria = []
        for entry in entries.order_by('ordering'):
            template = entry.template
            if template.status != 'published':
                continue
            for template_criterion in template.template_criteria.order_by('ordering'):
                criteria.append({
                    'criterion': template_criterion.criterion,
                    'template': template,
                    'weight': float(template_criterion.effective_weight),
                })
        return criteria

    def get_templates_ordered(self):
        """Return pack entries with templates in order."""
        return self.entries.select_related(
            'template__framework'
        ).order_by('ordering')

    @property
    def template_count(self):
        return self.entries.count()

    @property
    def published_template_count(self):
        return self.entries.filter(template__status='published').count()


class RubricPackEntry(models.Model):
    """
    Join table linking packs to templates with ordering.
    Only published templates can be added.
    """
    pack = models.ForeignKey(
        RubricPack,
        on_delete=models.CASCADE,
        related_name='entries',
        help_text="Parent pack"
    )
    template = models.ForeignKey(
        RubricTemplate,
        on_delete=models.PROTECT,
        related_name='in_packs',
        help_text="Template included in this pack"
    )
    ordering = models.PositiveIntegerField(
        default=0,
        help_text="Display order within the pack"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rubric_pack_entries'
        verbose_name = 'Pack Entry'
        verbose_name_plural = 'Pack Entries'
        ordering = ['pack', 'ordering']
        unique_together = ['pack', 'template']

    def __str__(self):
        return f"{self.pack.name} - {self.template.display_label}"

    def clean(self):
        """Validate that only published templates can be added to packs."""
        if self.template and self.template.status != 'published':
            raise ValidationError(
                "Only published templates can be added to rubric packs."
            )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
