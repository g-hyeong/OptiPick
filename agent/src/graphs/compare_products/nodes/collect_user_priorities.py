"""사용자 우선순위 수집 노드 (HITL - 두 번째 interrupt)"""

from src.utils.logger import get_logger
from ..state import CompareProductsState

logger = get_logger(__name__)


async def collect_user_priorities_node(state: CompareProductsState) -> dict:
    """
    사용자로부터 기준별 우선순위를 입력받는 노드

    이 노드는 interrupt_before로 설정되어, 사용자 입력을 기다립니다.
    사용자가 우선순위를 입력한 후 그래프가 재개되면, state에 'user_priorities'가 포함됩니다.

    Args:
        state: CompareProductsState

    Returns:
        빈 dict (상태 변경 없음, 단순 통과)
    """
    logger.info("━━━ Collect User Priorities Node ━━━")

    # 사용자 입력 확인
    user_priorities = state.get("user_priorities", {})
    extracted_criteria = state.get("extracted_criteria", [])

    if user_priorities:
        logger.info(f"  User priorities received: {len(user_priorities)} criteria")
        for criterion, priority in sorted(user_priorities.items(), key=lambda x: x[1]):
            logger.info(f"    {priority}위: {criterion}")
    else:
        logger.warning("  No user priorities provided (empty dict)")

    logger.info(f"  Total criteria available: {len(extracted_criteria)}")

    # 이 노드는 단순히 사용자 입력을 대기하는 역할
    # 실제 user_priorities는 API에서 그래프 재개 시 state에 주입됨
    return {}
