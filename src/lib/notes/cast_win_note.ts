const castWinNoteCode = `
use.miden::note
use.external_contract::game_contract

const.ERR_WRONG_NUMBER_OF_INPUTS = "Note expects exactly 5 note inputs"

#! Inputs (arguments):  [field_index]
begin
    push.0 exec.note::get_inputs
    # => [num_inputs, inputs_ptr]
    
    eq.5 assert.err=ERR_WRONG_NUMBER_OF_INPUTS
    # => [inputs_ptr]

    dup
    # => [inputs_ptr]
    
    padw movup.4 mem_loadw
    # => [WINNING_LINE]

    padw mem_loadw.4
    # => [0, 0, 0, nonce, WINNING_LINE]

    drop drop drop
    # => [nonce, WINNING_LINE]

    call.game_contract::cast_win

    dropw drop drop
    # => []
end
`;

export default castWinNoteCode;
