CEDULA_INVALID_MESSAGE = "La cédula ecuatoriana no es válida."


def normalize_cedula(value: str) -> str:
    return "".join(character for character in (value or "") if character.isdigit())


def is_valid_ecuadorian_cedula(value: str) -> bool:
    digits = normalize_cedula(value)
    if len(digits) != 10:
        return False

    province = int(digits[:2])
    if province < 1 or (province > 24 and province != 30):
        return False
    if int(digits[2]) >= 6:
        return False

    coefficients = (2, 1, 2, 1, 2, 1, 2, 1, 2)
    total = 0
    for index, coefficient in enumerate(coefficients):
        product = int(digits[index]) * coefficient
        if product >= 10:
            product -= 9
        total += product

    check = (10 - (total % 10)) % 10
    return check == int(digits[9])
