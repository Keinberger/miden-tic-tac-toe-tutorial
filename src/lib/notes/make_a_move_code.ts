const makeMoveNoteCode = `
use.miden::note
use.external_contract::game_contract

const.ERR_WRONG_NUMBER_OF_INPUTS = "Note expects exactly 2 note inputs"

#! Inputs (arguments):  [field_index]
begin
    push.0 exec.note::get_inputs
    # => [num_inputs, inputs_ptr]
    
    eq.2 assert.err=ERR_WRONG_NUMBER_OF_INPUTS
    # => [inputs_ptr]

    dup
    # => [inputs_ptr]
    
    padw movup.4 mem_loadw
    # => [0, 0, field_index, nonce]

    drop drop
    # => [field_index, nonce]

    swap
    # => [nonce, field_index]

    call.game_contract::make_a_move

    dropw drop
    # => []
end
`;

export default makeMoveNoteCode;
