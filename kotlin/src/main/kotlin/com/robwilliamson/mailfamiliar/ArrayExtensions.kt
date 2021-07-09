package com.robwilliamson.mailfamiliar

fun ByteArray.contentNotEquals(other: ByteArray): Boolean {
    return !contentEquals(other)
}
