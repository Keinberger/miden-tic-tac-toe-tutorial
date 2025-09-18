const makeWinMoveCode = `
use.miden::note
use.external_contract::game_contract

const.ERR_WRONG_NUMBER_OF_INPUTS = "Note expects exactly 4 note inputs"

#! Inputs (arguments):  [field_index]
begin
    push.0 exec.note::get_inputs
    # => [num_inputs, inputs_ptr]
    
    eq.4 assert.err=ERR_WRONG_NUMBER_OF_INPUTS
    # => [inputs_ptr]

    dup
    # => [inputs_ptr]
    
    padw movup.4 mem_loadw
    # => [field_index, nonce, winning_field_2, winning_field_3]

    call.game_contract::make_a_move

    push.999 debug.stack drop

    dropw drop
    # => []
end
`;
export default makeWinMoveCode;
