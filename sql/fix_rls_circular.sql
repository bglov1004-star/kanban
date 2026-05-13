-- ── RLS 순환 참조 수정 ────────────────────────────────────────────────────
-- boards ↔ board_members 정책이 서로를 참조해 500 에러 발생
-- SECURITY DEFINER 함수로 RLS를 우회해 순환 참조를 끊음

CREATE OR REPLACE FUNCTION is_board_owner(bid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM boards WHERE id = bid AND owner_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION is_board_member(bid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM board_members WHERE board_id = bid AND user_id = auth.uid())
$$;

-- ── boards ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "member read access" ON boards;

CREATE POLICY "member read access" ON boards
  FOR SELECT USING (is_board_member(id));

-- ── board_members ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "owner manages members" ON board_members;

CREATE POLICY "owner manages members" ON board_members
  FOR ALL
  USING    (is_board_owner(board_id))
  WITH CHECK (is_board_owner(board_id));

-- ── cards ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "board member select" ON cards;
DROP POLICY IF EXISTS "board member insert" ON cards;
DROP POLICY IF EXISTS "board member update" ON cards;
DROP POLICY IF EXISTS "board member delete" ON cards;

CREATE POLICY "board member select" ON cards
  FOR SELECT USING (is_board_owner(board_id) OR is_board_member(board_id));

CREATE POLICY "board member insert" ON cards
  FOR INSERT WITH CHECK (is_board_owner(board_id) OR is_board_member(board_id));

CREATE POLICY "board member update" ON cards
  FOR UPDATE USING (is_board_owner(board_id) OR is_board_member(board_id));

CREATE POLICY "board member delete" ON cards
  FOR DELETE USING (is_board_owner(board_id) OR is_board_member(board_id));

-- ── activities ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "board member read activities" ON activities;
DROP POLICY IF EXISTS "board member insert activities" ON activities;

CREATE POLICY "board member read activities" ON activities
  FOR SELECT USING (is_board_owner(board_id) OR is_board_member(board_id));

CREATE POLICY "board member insert activities" ON activities
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    (is_board_owner(board_id) OR is_board_member(board_id))
  );
