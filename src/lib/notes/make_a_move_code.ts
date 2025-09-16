const makeMoveNoteCode = `
use.miden::note
use.external_contract::game_contract

const.ERR_WRONG_NUMBER_OF_INPUTS = "Note expects exactly 1 note input"

#! Inputs (arguments):  [field_index]
begin
    push.0 exec.note::get_inputs
    # => [num_inputs, inputs_ptr]
    
    eq.5 assert.err=ERR_WRONG_NUMBER_OF_INPUTS
    # => [inputs_ptr]

    dup
    # => [inputs_ptr]

    add.4
    # => [inputs_ptr+4, inputs_ptr]

    swap
    # => [inputs_ptr, inputs_ptr+4]
    
    padw movup.4 mem_loadw
    # => [NONCE, inputs_ptr+4]

    padw movup.8 mem_loadw
    # [=> FIELD_INDEX, NONCE]

    drop drop drop
    # => [field_index, NONCE]

    movdn.4
    # => [NONCE, field_index]

    call.game_contract::make_a_move

    dropw drop
    # => []
end


`;

export default makeMoveNoteCode;
