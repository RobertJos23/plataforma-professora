"""
Importa todos os models para que o SQLAlchemy os registre
no metadata antes de criar as tabelas.
"""
from app.models.user import User, UserRole, LanguageLevel          # noqa: F401
from app.models.lesson import Lesson, LessonStatus, LessonType     # noqa: F401
from app.models.material import Material, MaterialAccess            # noqa: F401
from app.models.exercise import Exercise, ExerciseSubmission        # noqa: F401
from app.models.payment import Payment                              # noqa: F401
from app.models.progress import Progress, Badge, Notification       # noqa: F401
