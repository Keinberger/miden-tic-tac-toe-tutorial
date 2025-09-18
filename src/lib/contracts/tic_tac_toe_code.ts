export const ticTacToeCode = `

use.miden::account
use.miden::note
use.miden::account_id

# ERRORS
const.ERR_PLAYER_NOT_AUTHORIZED="Player not authorized"
const.ERR_WRONG_TURN="Not your turn, other player is on the move"
const.ERR_FIELD_PLAYED="Field has already been played on"
const.ERR_PLAYER_DOES_NOT_HAVE_VALUES="Supplied values have not been obtained by player"
const.ERR_NOT_WINNING_LINE="Supplied line is not a winning line"

# MEMORY ADDRESSES
const.NONCE_MEMORY_ADDR=0x0040
const.OWN_PLAYER_VALUES_SLOT_MEMORY_ADDR=0x0041
const.FIELD_INDEX_MEMORY_ADDR=0x0042

# STORAGE SLOTS

# Stores game nonce
const.NONCE_SLOT=0

# Nonce => Player1 ID + Player2 ID
const.PLAYER_IDS_MAPPING_SLOT=1

# Nonce => Player1 board values
const.PLAYER1_VALUES_MAPPING_SLOT=2

# Nonce => Player2 board values
const.PLAYER2_VALUES_MAPPING_SLOT=3

# Nonce => Winner
const.WINNERS_MAPPING_SLOT=4

# Line (X, Y, Z, 0) => True (1,0,0,0)
const.WINNING_LINES_MAPPING_SLOT=5

# Inputs: []
export.constructor
    # Store all possible winning lines in memory
    push.0.3.2.1 # 1 2 3
    mem_storew.4 dropw

    push.0.6.5.4 # 4 5 6
    mem_storew.8 dropw

    push.0.9.8.7 # 7 8 9
    mem_storew.12 dropw

    push.0.7.4.1 # 1 4 7
    mem_storew.16 dropw

    push.0.8.5.2 # 2 5 8
    mem_storew.20 dropw

    push.0.9.6.3 # 3 6 9
    mem_storew.24 dropw

    push.0.9.5.1 # 1 5 9
    mem_storew.28 dropw

    push.0.7.5.3 # 3 5 7
    mem_storew.32 dropw

    push.8
    dup neq.0
    # => [true, i]

    while.true
        dup mul.4
        # => [i*4, i]

        padw movup.4
        # => [i*8, 0, 0, 0, 0, i]

        mem_loadw
        # => [WINNING_LINE, i]

        push.0.0.0.1
        # => [TRUE, WINNING_LINE, i]

        swapw
        # => [WINNING_LINE, TRUE, i]

        push.WINNING_LINES_MAPPING_SLOT
        # => [winning_lines_mapping_slot, WINNING_LINE, TRUE, i]

        exec.account::set_map_item
        # => [OLD_MAP_ROOT, OLD_VALUE, i]

        dropw dropw
        # => [i]

        sub.1
        # => [i-1]

        dup neq.0
        # => [true/false, i-1]
    end

    drop
    # => []
end

# Inputs: [player2_prefix, player2_suffix]
export.create_game
    # get first player ID (sender)
    exec.note::get_sender
    # => [player1_prefix, player1_suffix, player2_prefix, player2_suffix]

    # get nonce
    push.NONCE_SLOT exec.account::get_item

    # Increment nonce
    add.1
    # => [NEW_NONCE, player1_prefix, player1_suffix, player2_prefix, player2_suffix]

    dupw
    # => [NEW_NONCE, NEW_NONCE, player1_prefix, player1_suffix, player2_prefix, player2_suffix]

    # Store nonce
    push.NONCE_SLOT exec.account::set_item
    # => [OLD_NONCE, NEW_NONCE, player1_prefix, player1_suffix, player2_prefix, player2_suffix]

    dropw
    # => [NEW_NONCE, player1_prefix, player1_suffix, player2_prefix, player2_suffix]

    # Store player IDs
    push.PLAYER_IDS_MAPPING_SLOT
    # => [mapping_slot, NEW_NONCE, player1_prefix, player1_suffix, player2_prefix, player2_suffix]

    exec.account::set_map_item
    # => [OLD_MAP_ROOT, OLD_MAP_VALUE]
    
    dropw dropw
    # => []
end

# Inputs: [nonce, field_index, ...2_winning_line_indexes?]
export.make_a_move
    # Store nonce in memory to use later
    mem_store.NONCE_MEMORY_ADDR
    mem_store.FIELD_INDEX_MEMORY_ADDR
    # => []
    
    # Verify sender is part of game at particular nonce
    exec.verify_and_get_player_slot
    # => [other_player_values_mapping_slot, player_values_mapping_slot]

    swap
    # => [player_values_mapping_slot, other_player_values_mapping_slot]

    mem_store.OWN_PLAYER_VALUES_SLOT_MEMORY_ADDR
    # => [other_player_values_mapping_slot]

    exec.has_field_index
    # => [other_has_field_index, other_num_of_non_zero_values]

    neq.1 assert.err=ERR_FIELD_PLAYED
    # => [other_num_of_non_zero_values]

    # Check if own player has field index
    mem_load.OWN_PLAYER_VALUES_SLOT_MEMORY_ADDR
    # => [player_values_mapping_slot, other_num_of_non_zero_values]

    exec.has_field_index
    # => [own_has_field_index, own_num_of_non_zero_values, other_num_of_non_zero_values]

    neq.1 assert.err=ERR_FIELD_PLAYED
    # => [own_num_of_non_zero_values, other_num_of_non_zero_values]

    # Compare number of non-zero items between the two (to verify who is on the move)

    swap
    # => [other_num_of_non_zero_values, own_num_of_non_zero_values]
    
    mem_load.OWN_PLAYER_VALUES_SLOT_MEMORY_ADDR
    # => [own_player_slot, other_num_of_non_zero_values, own_num_of_non_zero_values]

    push.PLAYER1_VALUES_MAPPING_SLOT eq
    if.true
        # => [other_num_of_non_zero_values, own_num_of_non_zero_values]
        # (if ID=1 => other player num has to be equal)
        dup.1 eq assert.err=ERR_WRONG_TURN
    else
        # => [other_num_of_non_zero_values, own_num_of_non_zero_values]
        # (if ID=2 => other player (player1) num has to be greater)
        dup.1 gt assert.err=ERR_WRONG_TURN
    end
    # => [own_num_of_values]

    # Check if player is making final move
    push.4 eq
    if.true
        # Final move (no storage, directly checking win)
        # if final move (use additional stack items to cast winning line)
        # call cast_win
        
        mem_load.FIELD_INDEX_MEMORY_ADDR
        # => [field_index, winning_line_index1, winning_line_index2]

        push.0 movdn.2
        # => [UNORDERED_WINNING_LINE]

        # Pass unordered winning line, where first index is the new field_index
        exec.internal_cast_win
    else
        # Making normal move
        # => []

        mem_load.NONCE_MEMORY_ADDR
        mem_load.OWN_PLAYER_VALUES_SLOT_MEMORY_ADDR
        # => [slot, nonce]

        exec.get_map_value_from_nonce
        # => [PLAYER_VALUES]

        movup.3 drop
        # => [PLAYER_VALUES-1]

        mem_load.FIELD_INDEX_MEMORY_ADDR
        # => [NEW_PLAYER_VALUES]

        mem_load.NONCE_MEMORY_ADDR exec.felt_to_word
        # => [NONCE, NEW_PLAYER_VALUES]

        mem_load.OWN_PLAYER_VALUES_SLOT_MEMORY_ADDR
        # => [player_values_slot, NONCE, NEW_PLAYER_VALUES]

        # Store new values
        exec.account::set_map_item
        # => [OLD_MAP_ROOT, OLD_MAP_VALUE]

        dropw dropw
        # => []
    end
end

# Inputs: [nonce, WINNING_LINE]
# cast_win procedure for "casting win" (throws error if no valid win)
# procedure for casting win game (calls check_win, calls check_draw, if both fail => error)
export.cast_win
    mem_store.NONCE_MEMORY_ADDR
    # => [WINNING_LINE]

    exec.verify_and_get_player_slot drop
    # => [own_player_slot, WINNING_LINE]

    mem_store.OWN_PLAYER_VALUES_SLOT_MEMORY_ADDR
    # => [WINNING_LINE]

    dupw
    # => [WINNING_LINE, WINNING_LINE]

    exec.check_if_winning_line
    # => [true_or_false, WINNING_LINE]

    assert.err=ERR_NOT_WINNING_LINE
    # => [WINNING_LINE]

    # Check if player actually has all values contained in WINNING_LINE

    mem_load.OWN_PLAYER_VALUES_SLOT_MEMORY_ADDR
    # => [own_player_slot, WINNING_LINE]

    push.3
    # => [n, own_player_slot, WINNING_LINE]

    swap
    # => [own_player_slot, n, WINNING_LINE]

    exec.check_player_values
    # => [true_or_false]

    assert.err=ERR_PLAYER_DOES_NOT_HAVE_VALUES
    # => []

    # Write to winners mapping
    exec.store_winner
    # => []
end

# Inputs: [WINNING_LINE]
# Memory requirements: nonce & own_player_values_slot
proc.internal_cast_win
    # Check if player actually has all values contained in WINNING_LINE (except first one)

    dupw
    # => [WINNING_LINE, WINNING_LINE]
    
    # Move first value (non-stored FIELD_INDEX) to last index in word
    movdn.2
    # => [WINNING_LINE, ORIGINAL_WINNING_LINE]

    # Push n to stack (2 = checking first 2 values of the line)
    push.2
    # => [n, WINNING_LINE, ORIGINAL_WINNING_LINE]

    mem_load.OWN_PLAYER_VALUES_SLOT_MEMORY_ADDR
    # => [own_player_values_slot, n, WINNING_LINE, ORIGINAL_WINNING_LINE]

    exec.check_player_values
    # => [true_or_false, ORIGINAL_WINNING_LINE]

    assert.err=ERR_PLAYER_DOES_NOT_HAVE_VALUES
    # => [ORIGINAL_WINNING_LINE]

    # TODO: Convert to ordered winning line

    # Check if supplied line is a winning line

    exec.check_if_winning_line
    # => [true_or_false]

    assert.err=ERR_NOT_WINNING_LINE
    # => []

    # Write to winners mapping
    exec.store_winner
    # => []
end

# Inputs: []
# Memory requirements: nonce & own_player_values_slot
# Outputs: []
proc.store_winner
    # Write to winners mapping
    mem_load.OWN_PLAYER_VALUES_SLOT_MEMORY_ADDR exec.felt_to_word
    # => [OWN_PLAYER_VALUES_SLOT]

    mem_load.NONCE_MEMORY_ADDR exec.felt_to_word
    # => [NONCE, OWN_PLAYER_VALUES_SLOT]

    push.WINNERS_MAPPING_SLOT
    # => [winners_mapping_slot, NONCE, OWN_PLAYER_VALUES_SLOT]
    
    exec.account::set_map_item
    # => [OLD_MAP_ROOT, OLD_VALUE]

    dropw dropw
    # => []
end

# Checks if a player has all 0-to-n indexes field values of LINE_TO_CHECK
# Inputs: [player_slot, n, LINE_TO_CHECK]
# Outputs: [true_or_false]
proc.check_player_values.2
    loc_store.0
    # => [n, LINE_TO_CHECK]
    
    loc_store.1
    # => [LINE_TO_CHECK]

    push.1 movdn.4
    # => [LINE_TO_CHECK, true]

    push.1 dup
    # => [true, i, LINE_TO_CHECK, true]

    while.true
        movdn.5
        # => [LINE_TO_CHECK, true, i]

        mem_store.FIELD_INDEX_MEMORY_ADDR
        # => [LINE_TO_CHECK-1, true, i]

        loc_load.0
        # => [player_slot, LINE_TO_CHECK-1, true, i]

        exec.has_field_index
        # => [has_field_index, num_of_non_zero_values, LINE_TO_CHECK-1, true, i]

        # False => player does not have value
        # End loop & return indication that player does not have field
        if.false
            drop
            # => [LINE_TO_CHECK-1, true, i]

            movup.3 drop
            # => [LINE_TO_CHECK-1, i]

            movup.3 drop
            # => [LINE_TO_CHECK-1]

            push.0 movdn.3
            # => [LINE_TO_CHECK-1, false]

            loc_load.1
            # => [n, LINE_TO_CHECK-1, false]

            sub.1 movdn.4
            # => [LINE_TO_CHECK-1, false, n-1]
            
            push.0
            # => [num_of_non_zero_values, LINE_TO_CHECK-1, false, n-1]
        end
        # => [num_of_non_zero_values, LINE_TO_CHECK-1, true_or_false, i]

        drop
        # => [LINE_TO_CHECK-1, true_or_false, i]

        push.0 movdn.3
        # => [LINE_TO_CHECK, true_or_false, i]

        movup.5
        # => [i, LINE_TO_CHECK, true_or_false]

        add.1
        # => [i+1, LINE_TO_CHECK, true_or_false]

        dup
        # => [i+1, i+1, LINE_TO_CHECK, true_or_false]

        loc_load.1
        # => [n, i+1, i+1, LINE_TO_CHECK, true_or_false]

        neq
        # => [true_or_false, i+1, LINE_TO_CHECK, true_or_false]
    end
    # => [last_i, EMPTY_WORD, true_or_false]

    drop
    # => [EMPTY_WORD, true_or_false]

    dropw
    # => [true_or_false]
end

# Checks if player has field_index inside of their mapping
# Memory requirements: nonce & field_index
# Inputs: [player_slot]
# Outputs: [has_field_index, num_of_non_zero_values]
proc.has_field_index.1
    loc_store.0
    # => []

    push.0.0.0
    # => [i, has_field_index, num_of_non_zero_values]

    mem_load.NONCE_MEMORY_ADDR
    loc_load.0
    # => [player_slot, nonce, i, has_field_index, num_of_non_zero_values]
    
    exec.get_map_value_from_nonce
    # => [PLAYER_VALUES, i, has_field_index, num_of_non_zero_values]

    push.1
    # [true, PLAYER_VALUES, i, has_field_index, num_of_non_zero_values]

    while.true
        # => [PLAYER_VALUES, i, has_field_index, num_of_non_zero_values]

        mem_load.FIELD_INDEX_MEMORY_ADDR
        # => [field_index, PLAYER_VALUES, i, has_field_index, num_of_non_zero_values]

        # Compare field_index to first field in PLAYER_VALUES
        dup.1 eq
        # => [is_equal, PLAYER_VALUES, i, has_field_index, num_of_non_zero_values]

        # Found the field index => make has_field_index true
        if.true
            # => [PLAYER_VALUES, i, has_field_index, num_of_non_zero_values]
            
            movup.5 add.1
            # => [true, PLAYER_VALUES, i, num_of_non_zero_values]

            movdn.5
            # => [PLAYER_VALUES, i, true, num_of_non_zero_values]
        else
            # Check for non zero
            # => [PLAYER_VALUES, i, has_field_index, num_of_non_zero_values]
            
            push.0 dup.1 neq
            # => [is_not_zero, PLAYER_VALUES, i, has_field_index, num_of_non_zero_values]

            # True = Value is a non-zero value
            if.true
                # Increment count of num_of_non_zero_values

                movup.6 add.1
                # => [num_of_non_zero_values+1, PLAYER_VALUES, i, has_field_index]

                movdn.6
                # => [PLAYER_VALUES, i, has_field_index, num_of_non_zero_values+1]
            end
        end
        # => [PLAYER_VALUES, i, has_field_index, num_of_non_zero_values]

        # Delete first element and replace by 0
        drop
        # => [PLAYER_VALUES-1, i, has_field_index, num_of_non_zero_values]

        push.0 movdn.3
        # => [MODIFIED_PLAYER_VALUES, i, has_field_index, num_of_non_zero_values]

        movup.4 add.1
        # => [i+1, MODIFIED_PLAYER_VALUES, has_field_index, num_of_non_zero_values]

        movdn.4
        # => [MODIFIED_PLAYER_VALUES, i+1, has_field_index, num_of_non_zero_values]

        dup.4 neq.4
        # => [true/false, MODIFIED_PLAYER_VALUES, i+1, has_field_index, num_of_non_zero_values]
    end
    # => [EMPTY_WORD, last_i, has_field_index, num_of_non_zero_values]

    dropw
    # => [last_i, has_field_index, num_of_non_zero_values]
    
    drop
    # => [has_field_index, num_of_non_zero_values]
end

# Inputs: []
# Memory requirements: nonce
# Outputs: [other_player_slot, player_slot]
proc.verify_and_get_player_slot
    mem_load.NONCE_MEMORY_ADDR
    # => [nonce]

    push.PLAYER_IDS_MAPPING_SLOT
    # => [player_ids_slot, nonce]

    exec.get_map_value_from_nonce
    # => [PLAYER_IDS]

    exec.note::get_sender
    # => [caller_prefix, caller_suffix, PLAYER_IDS]

    exec.account_id::is_equal
    # => [is_player1, player2_prefix, player2_suffix]

    if.false
        exec.note::get_sender
        # => [caller_prefix, caller_suffix, player2_prefix, player2_suffix]

        exec.account_id::is_equal
        # => [is_player2]

        assert.err=ERR_PLAYER_NOT_AUTHORIZED
        # => []

        push.PLAYER2_VALUES_MAPPING_SLOT.PLAYER1_VALUES_MAPPING_SLOT
    else
        drop drop
        # => []

        push.PLAYER1_VALUES_MAPPING_SLOT.PLAYER2_VALUES_MAPPING_SLOT
    end
    # => [other_player_values_mapping_slot, player_values_mapping_slot]
end

# Inputs: [WINNING_LINE]
# Outputs: [true_or_false]
proc.check_if_winning_line
    push.WINNING_LINES_MAPPING_SLOT
    # => [slot, WINNING_LINE]

    exec.account::get_map_item
    # => [TRUE_OR_FALSE]

    # Check if supplied line is a winning line
    # Push zero word to stack and compare it to EMPTY_WORD (to determine if supplied line is valid)
    padw eqw
    # => [not_winning_line, EMPTY_WORD, TRUE_OR_FALSE]

    movdn.8
    # => [EMPTY_WORD, TRUE_OR_FALSE, not_winning_line]

    dropw dropw
    # => [not_winning_line]

    push.0 eq
    # => [is_winning_line]
end

# Inputs: [slot, nonce]
# Outputs: [VALUE]
proc.get_map_value_from_nonce
    swap
    # => [nonce, slot]

    exec.felt_to_word
    # => [NONCE, slot]

    movup.4
    # => [slot, NONCE]

    exec.account::get_map_item
    # => [VALUE]
end

# Inputs: [felt]
# Outputs: [WORD]
proc.felt_to_word
    push.0.0.0
    # => [0, 0, 0, felt]

    movup.3
    # => [WORD]
end
`;

export default ticTacToeCode;
