
from app import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), nullable=False, unique=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(70), nullable = True)
    def __repr__(self):
        return f"User('{self.username}', '{self.email}')"

class AssistantScenario(db.Model):
    __tablename__ = 'assistant_scenarios'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    scenario_text = db.Column(db.Text, nullable=False)
    additional_instructions = db.Column(db.Text, nullable=False)
    enable = db.Column(db.Boolean, default=True, nullable=False)
    role = db.Column(db.Text, nullable=False, default='Adult')
    communication_preferences = db.Column(db.Text, nullable= True)

    openid = db.Column(db.Text, nullable=False)

    tags = db.relationship('Tags', backref='assistant_scenario', lazy=True, cascade="all, delete-orphan")
    rubrics = db.relationship('RubricQuestion', backref='assistant_scenario', lazy=True, cascade="all, delete-orphan")

    def __init__(self, scenario_text, additional_instructions, role,communication_preferences, openid, enable=True):
        self.scenario_text = scenario_text
        self.additional_instructions = additional_instructions
        self.enable = enable
        self.role = role
        self.communication_preferences = communication_preferences
        self.openid = openid

    def __repr__(self):
        return f"<AssistantScenario {self.id}>"

    def enable_scenario(self):
        self.enable = True
        db.session.commit()

    def disable_scenario(self):
        self.enable = False
        db.session.commit()

    def serialize(self):
        return {
            'id': self.id,
            'scenario_text': self.scenario_text,
            'additional_instructions': self.additional_instructions,
            'enable': self.enable,
            'role': self.role,
            'openid': self.openid,
            'communication_preferences':self.communication_preferences,
            'tags': [tag.tag for tag in self.tags],
            'rubrics': [rubric.question for rubric in self.rubrics]
        }
class RubricQuestion(db.Model):
    __tablename__ = 'rubric_questions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question = db.Column(db.Text, nullable=False)
    scenario_id = db.Column(db.Integer, db.ForeignKey('assistant_scenarios.id'), nullable=False)

    scenario = db.relationship('AssistantScenario', backref=db.backref('rubric_questions', lazy=True))

    def __init__(self, question, scenario_id):
        self.question = question
        self.scenario_id = scenario_id

    def __repr__(self):
        return f"<RubricQuestion {self.id}: {self.question}>"

class Tags(db.Model):
    __tablename__ = 'assistant_tags'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tag = db.Column(db.Text, nullable=False)
    scenario_id = db.Column(db.Integer, db.ForeignKey('assistant_scenarios.id'), nullable=False)

    scenario = db.relationship('AssistantScenario', backref=db.backref('assistant_tags', lazy=True))

    def __init__(self, tag, scenario_id):
        self.tag = tag
        self.scenario_id = scenario_id

    def __repr__(self):
        return f"<Tag {self.id}: {self.tag}>"


class Category(db.Model):
    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    total_required_to_pass = db.Column(db.Integer, nullable=False)

    # Relationship to SubCategory
    subcategories = db.relationship(
        'SubCategory',
        backref='category',
        lazy=True,
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Category {self.name}>"

    def serialize(self):
        return {
            'id': self.id,
            'name': self.name,
            'total_required_to_pass': self.total_required_to_pass,
            'subcategories': [s.serialize() for s in self.subcategories]
        }


class SubCategory(db.Model):
    __tablename__ = 'subcategories'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    marking_instructions = db.Column(db.Text, nullable=False)

    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)

    def __repr__(self):
        return f"<SubCategory {self.name} ({self.category.name})>"

    def serialize(self):
        return {
            'id': self.id,
            'name': self.name,
            'marking_instructions': self.marking_instructions,
            'category_id': self.category_id
        }


# Association table for many-to-many relationship between Activity and Category
activity_categories = db.Table(
    'activity_categories',
    db.Column('activity_id', db.Integer, db.ForeignKey('activities.id'), primary_key=True),
    db.Column('category_id', db.Integer, db.ForeignKey('categories.id'), primary_key=True)
)

class Activity(db.Model):
    __tablename__ = 'activities'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    pre_brief = db.Column(db.Text, nullable=False)

    character_id = db.Column(db.Integer, db.ForeignKey('assistant_scenarios.id'), nullable=False)
    character = db.relationship(
        'AssistantScenario',
        backref=db.backref('activities', lazy=True, cascade="all, delete-orphan")
    )

    categories = db.relationship(
        'Category',
        secondary=activity_categories,
        backref=db.backref('activities', lazy='dynamic')
    )

    def __repr__(self):
        return f"<Activity {self.id} - Character {self.character_id}>"

    def serialize(self):
        return {
            'id': self.id,
            'pre_brief': self.pre_brief,
            'character_id': self.character_id,
            'categories': [category.id for category in self.categories]
        }