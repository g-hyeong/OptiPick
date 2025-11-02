"""사용자 기준 수집 노드 (HITL - 첫 번째 interrupt)"""

from src.utils.logger import get_logger
from ..state import CompareProductsState

logger = get_logger(__name__)


async def collect_user_criteria_node(state: CompareProductsState) -> dict:
    """
    사용자로부터 중요 기준 키워드를 입력받는 노드

    이 노드는 interrupt_before로 설정되어, 사용자 입력을 기다립니다.
    사용자가 입력한 후 그래프가 재개되면, state에 'user_criteria'가 포함되어 있습니다.

    Args:
        state: CompareProductsState

    Returns:
        빈 dict (상태 변경 없음, 단순 통과)
    """
    logger.info("━━━ Collect User Criteria Node ━━━")

    # 사용자 입력 확인
    user_criteria = state.get("user_criteria", [])

    if user_criteria:
        logger.info(f"  User provided criteria: {', '.join(user_criteria)}")
    else:
        logger.warning("  No user criteria provided (empty list)")

    # 이 노드는 단순히 사용자 입력을 대기하는 역할
    # 실제 user_criteria는 API에서 그래프 재개 시 state에 주입됨
    return {}
