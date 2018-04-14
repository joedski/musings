#include <functional>
#include <iostream>

class ColorMonad {
public:
  float r;
  float g;
  float b;

  ColorMonad map(std::function<ColorMonad (ColorMonad &)> fn) {
    // NOTE: `this` is a pointer, not a reference, so to pass by reference
    // we have to first dereference.
    return fn(*this);
  }

  ColorMonad mutate(std::function<void (ColorMonad &)> fn) {
    fn(*this);
    return *this;
  }
};

struct TransferVector3 {
  float r;
  float g;
  float b;
};

struct TransferMatrix3x3 {
  struct TransferVector3 r;
  struct TransferVector3 g;
  struct TransferVector3 b;
};

// We're already copying the transfer matrix in the lambda, so we'll just go by reference
// in the lambda-creator function.
std::function<ColorMonad (ColorMonad &)> convolveColor(const TransferMatrix3x3 &transfer) {
  return [=](ColorMonad &c) -> ColorMonad {
    return {
      .r = c.r * transfer.r.r + c.g * transfer.r.g + c.b * transfer.r.b,
      .g = c.r * transfer.g.r + c.g * transfer.g.g + c.b * transfer.g.b,
      .b = c.r * transfer.b.r + c.g * transfer.b.g + c.b * transfer.b.b,
    };
  };
}

int main() {
  ColorMonad c0 = {1.0, 0.5, 0.7};
  ColorMonad c1 = c0.map([](ColorMonad &c) -> ColorMonad {
    return {
      c.r + c.g * 0.25 + c.b * 0.375,
      c.g * 0.75 + c.b * 0.25,
      c.b * 0.5
    };
  });

  // Behold, using structs.
  ColorMonad c11 = c0.map(convolveColor({
    {1.0f, 0.25f, 0.375f},
    {0.0f, 0.75f, 0.25f},
    {0.0f, 0.0f, 0.5f}
  }));

  std::cout << "c1:        " << c1.r << ", " << c1.g << ", " << c1.b << std::endl;
  std::cout << "c11:       " << c11.r << ", " << c11.g << ", " << c11.b << std::endl;

  c1.mutate([](ColorMonad &c) {
    c.r += 1;
    c.g += 1;
    c.b += 1;
  });

  std::cout << "c1.mutate: " << c1.r << ", " << c1.g << ", " << c1.b << std::endl;
}
